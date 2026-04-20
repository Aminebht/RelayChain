const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RelayEscrow v2.1", function () {
  async function deployFixture() {
    const [owner, sender, recipient, carrierA, carrierB, outsider] = await ethers.getSigners();

    const Reputation = await ethers.getContractFactory("CarrierReputation");
    const reputation = await Reputation.connect(owner).deploy();
    await reputation.waitForDeployment();

    const Relay = await ethers.getContractFactory("RelayEscrow");
    const relay = await Relay.connect(owner).deploy(await reputation.getAddress());
    await relay.waitForDeployment();

    await reputation.connect(owner).setRelayContract(await relay.getAddress());

    return { relay, reputation, owner, sender, recipient, carrierA, carrierB, outsider };
  }

  async function createAndPayParcel(relay, sender, recipient, price) {
    await relay.connect(sender).postParcel(recipient.address, price);
    const parcelId = await relay.parcelCount();
    await relay.connect(recipient).payForParcel(parcelId, { value: price });
    return parcelId;
  }

  async function onboard(reputation, owner, carrier) {
    await reputation.connect(owner).onboardCarrier(carrier.address);
  }

  it("rejects unauthorized incoming during acknowledgeHandoff", async function () {
    const { relay, reputation, owner, sender, recipient, carrierA, carrierB, outsider } = await deployFixture();
    const price = ethers.parseEther("6");

    await onboard(reputation, owner, carrierA);
    await onboard(reputation, owner, carrierB);

    const parcelId = await createAndPayParcel(relay, sender, recipient, price);
    await relay.connect(carrierA).acceptLeg(parcelId);

    const hash = ethers.id("handoff-1");
    await relay.connect(carrierA).initiateHandoff(parcelId, carrierB.address, hash);

    await expect(
      relay.connect(outsider).acknowledgeHandoff(parcelId, hash)
    ).to.be.revertedWith("Incoming non autorise");
  });

  it("reverts when outgoing and incoming hashes diverge", async function () {
    const { relay, reputation, owner, sender, recipient, carrierA, carrierB } = await deployFixture();
    const price = ethers.parseEther("6");

    await onboard(reputation, owner, carrierA);
    await onboard(reputation, owner, carrierB);

    const parcelId = await createAndPayParcel(relay, sender, recipient, price);
    await relay.connect(carrierA).acceptLeg(parcelId);

    await relay.connect(carrierA).initiateHandoff(parcelId, carrierB.address, ethers.id("hash-a"));

    await expect(
      relay.connect(carrierB).acknowledgeHandoff(parcelId, ethers.id("hash-b"))
    ).to.be.revertedWith("Hashes divergents");
  });

  it("finalizes only via confirmDelivery and releases payment with fee", async function () {
    const { relay, reputation, owner, sender, recipient, carrierA, carrierB, outsider } = await deployFixture();
    const price = ethers.parseEther("10");

    await onboard(reputation, owner, carrierA);
    await onboard(reputation, owner, carrierB);

    const parcelId = await createAndPayParcel(relay, sender, recipient, price);
    await relay.connect(carrierA).acceptLeg(parcelId);

    const hash = ethers.id("handoff-final");
    await relay.connect(carrierA).initiateHandoff(parcelId, carrierB.address, hash);
    await relay.connect(carrierB).acknowledgeHandoff(parcelId, hash);

    await expect(relay.connect(outsider).confirmDelivery(parcelId)).to.be.revertedWith("Seul destinataire");

    await expect(relay.connect(recipient).confirmDelivery(parcelId)).to.not.be.reverted;

    const parcel = await relay.parcels(parcelId);
    expect(parcel.status).to.equal(4);
    expect(await relay.platformReserve()).to.equal((price * 5n) / 100n);
  });

  it("handles reserve insufficiency with PartialRefund and pending debt", async function () {
    const { relay, reputation, owner, sender, recipient, carrierA } = await deployFixture();
    const price = ethers.parseEther("10");

    await onboard(reputation, owner, carrierA);
    const parcelId = await createAndPayParcel(relay, sender, recipient, price);

    await relay.connect(carrierA).acceptLeg(parcelId);
    await relay.connect(recipient).openDispute(parcelId);

    await expect(relay.connect(owner).resolveDispute(parcelId, 0))
      .to.emit(relay, "PartialRefund");

    expect(await relay.pendingRefunds(sender.address)).to.equal(price);

    await expect(relay.connect(sender).claimPendingRefund()).to.be.revertedWith("Reserve insuffisante");

    await relay.connect(owner).topUpReserve({ value: price });

    await expect(relay.connect(sender).claimPendingRefund())
      .to.emit(relay, "RefundClaimed");

    expect(await relay.pendingRefunds(sender.address)).to.equal(0n);
  });

  it("triggers handoff timeout with penalty and outgoing unlock", async function () {
    const { relay, reputation, owner, sender, recipient, carrierA, carrierB } = await deployFixture();
    const price = ethers.parseEther("10");

    await onboard(reputation, owner, carrierA);
    await onboard(reputation, owner, carrierB);

    const startPoints = await reputation.getPoints(carrierA.address);
    const parcelId = await createAndPayParcel(relay, sender, recipient, price);

    await relay.connect(carrierA).acceptLeg(parcelId);
    expect(await relay.lockedByParcel(parcelId, carrierA.address)).to.equal(price);

    await relay.connect(carrierA).initiateHandoff(parcelId, carrierB.address, ethers.id("timeout-handoff"));

    await ethers.provider.send("evm_increaseTime", [2 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(relay.connect(carrierB).triggerTimeout(parcelId))
      .to.emit(relay, "TimeoutTriggered");

    const parcel = await relay.parcels(parcelId);
    expect(parcel.status).to.equal(3);
    expect(await relay.lockedByParcel(parcelId, carrierA.address)).to.equal(0n);

    const endPoints = await reputation.getPoints(carrierA.address);
    expect(endPoints).to.equal(startPoints - price / 20n);
  });

  it("naturally resets monthly dispute limit with monthIndex", async function () {
    const { relay, reputation, owner, sender, recipient, carrierA } = await deployFixture();
    const price = ethers.parseEther("4");

    await onboard(reputation, owner, carrierA);

    for (let i = 0; i < 3; i += 1) {
      const id = await createAndPayParcel(relay, sender, recipient, price);
      await relay.connect(carrierA).acceptLeg(id);
      await relay.connect(recipient).openDispute(id);
    }

    const id4 = await createAndPayParcel(relay, sender, recipient, price);
    await relay.connect(carrierA).acceptLeg(id4);
    await expect(relay.connect(recipient).openDispute(id4)).to.be.revertedWith("Limite mensuelle atteinte");

    await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    const id5 = await createAndPayParcel(relay, sender, recipient, price);
    await relay.connect(carrierA).acceptLeg(id5);
    await expect(relay.connect(recipient).openDispute(id5)).to.not.be.reverted;
  });

  it("releases locks correctly when same carrier handles multiple hops", async function () {
    const { relay, reputation, owner, sender, recipient, carrierA, carrierB } = await deployFixture();
    const price = ethers.parseEther("6");

    await onboard(reputation, owner, carrierA);
    await onboard(reputation, owner, carrierB);

    const parcelId = await createAndPayParcel(relay, sender, recipient, price);

    await relay.connect(carrierA).acceptLeg(parcelId);
    expect(await relay.lockedByParcel(parcelId, carrierA.address)).to.equal(price);
    expect(await relay.totalLockedByCarrier(carrierA.address)).to.equal(price);

    const h1 = ethers.id("loop-1");
    await relay.connect(carrierA).initiateHandoff(parcelId, carrierB.address, h1);
    await relay.connect(carrierB).acknowledgeHandoff(parcelId, h1);

    expect(await relay.lockedByParcel(parcelId, carrierA.address)).to.equal(0n);
    expect(await relay.totalLockedByCarrier(carrierA.address)).to.equal(0n);
    expect(await relay.lockedByParcel(parcelId, carrierB.address)).to.equal(0n);

    await relay.connect(carrierA).acceptLeg(parcelId);
    expect(await relay.lockedByParcel(parcelId, carrierA.address)).to.equal(price);
    expect(await relay.totalLockedByCarrier(carrierA.address)).to.equal(price);

    const h2 = ethers.id("loop-2");
    await relay.connect(carrierA).initiateHandoff(parcelId, carrierB.address, h2);
    await relay.connect(carrierB).acknowledgeHandoff(parcelId, h2);

    await relay.connect(recipient).confirmDelivery(parcelId);

    expect(await relay.lockedByParcel(parcelId, carrierA.address)).to.equal(0n);
    expect(await relay.totalLockedByCarrier(carrierA.address)).to.equal(0n);
  });

  it("handles dispute timeout with partial reserve and sender debt", async function () {
    const { relay, reputation, owner, sender, recipient, carrierA } = await deployFixture();
    const price = ethers.parseEther("10");
    const reserveTopUp = ethers.parseEther("4");

    await onboard(reputation, owner, carrierA);

    const parcelId = await createAndPayParcel(relay, sender, recipient, price);
    await relay.connect(carrierA).acceptLeg(parcelId);
    await relay.connect(owner).topUpReserve({ value: reserveTopUp });
    await relay.connect(recipient).openDispute(parcelId);

    await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(relay.connect(owner).triggerTimeout(parcelId))
      .to.emit(relay, "PartialRefund");

    const parcel = await relay.parcels(parcelId);
    expect(parcel.status).to.equal(6);
    expect(await relay.platformReserve()).to.equal(0n);
    expect(await relay.pendingRefunds(sender.address)).to.equal(price - reserveTopUp);
  });

  it("rejects reentrant claimPendingRefund from malicious receiver", async function () {
    const [owner, recipient, carrierA] = await ethers.getSigners();

    const Reputation = await ethers.getContractFactory("CarrierReputation");
    const reputation = await Reputation.connect(owner).deploy();
    await reputation.waitForDeployment();

    const Relay = await ethers.getContractFactory("RelayEscrow");
    const relay = await Relay.connect(owner).deploy(await reputation.getAddress());
    await relay.waitForDeployment();
    await reputation.connect(owner).setRelayContract(await relay.getAddress());

    const Attacker = await ethers.getContractFactory("ReentrantRefundAttacker");
    const attacker = await Attacker.connect(owner).deploy(await relay.getAddress());
    await attacker.waitForDeployment();

    await reputation.connect(owner).onboardCarrier(carrierA.address);

    const price = ethers.parseEther("10");
    await attacker.connect(owner).postParcelAsSender(recipient.address, price);
    const parcelId = await relay.parcelCount();

    await relay.connect(recipient).payForParcel(parcelId, { value: price });
    await relay.connect(carrierA).acceptLeg(parcelId);
    await relay.connect(recipient).openDispute(parcelId);

    await relay.connect(owner).resolveDispute(parcelId, 0);
    expect(await relay.pendingRefunds(await attacker.getAddress())).to.equal(price);

    await relay.connect(owner).topUpReserve({ value: price });

    await expect(attacker.connect(owner).attackClaim()).to.not.be.reverted;
    expect(await relay.pendingRefunds(await attacker.getAddress())).to.equal(0n);
  });
});
