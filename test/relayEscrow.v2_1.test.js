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
    await relay.connect(sender).postParcel(recipient.address, price, "pickup", "dropoff");
    const parcelId = await relay.parcelCount();
    await relay.connect(recipient).payForParcel(parcelId, { value: price });
    return parcelId;
  }

  async function onboard(reputation, owner, carrier) {
    await reputation.connect(owner).onboardCarrier(carrier.address);
  }

  it("locks parcel to a single carrier once accepted", async function () {
    const { relay, reputation, owner, sender, recipient, carrierA, carrierB } = await deployFixture();
    const price = ethers.parseEther("6");

    await onboard(reputation, owner, carrierA);
    await onboard(reputation, owner, carrierB);

    const parcelId = await createAndPayParcel(relay, sender, recipient, price);
    await expect(relay.connect(carrierA).acceptParcel(parcelId))
      .to.emit(relay, "ParcelAccepted")
      .withArgs(parcelId, carrierA.address);

    const parcel = await relay.parcels(parcelId);
    expect(parcel.carrier).to.equal(carrierA.address);
    expect(parcel.status).to.equal(2);

    await expect(relay.connect(carrierB).acceptParcel(parcelId)).to.be.revertedWith("Deja pris");
  });

  it("finalizes only via confirmDelivery and releases payment with fee", async function () {
    const { relay, reputation, owner, sender, recipient, carrierA, outsider } = await deployFixture();
    const price = ethers.parseEther("10");

    await onboard(reputation, owner, carrierA);

    const parcelId = await createAndPayParcel(relay, sender, recipient, price);
    await relay.connect(carrierA).acceptParcel(parcelId);

    await expect(relay.connect(outsider).confirmDelivery(parcelId)).to.be.revertedWith("Seul destinataire");

    await expect(relay.connect(recipient).confirmDelivery(parcelId)).to.not.be.reverted;

    const parcel = await relay.parcels(parcelId);
    expect(parcel.status).to.equal(3);
    expect(await relay.platformReserve()).to.equal((price * 5n) / 100n);
  });

  it("handles reserve insufficiency with PartialRefund and pending debt", async function () {
    const { relay, reputation, owner, sender, recipient, carrierA } = await deployFixture();
    const price = ethers.parseEther("10");

    await onboard(reputation, owner, carrierA);
    const parcelId = await createAndPayParcel(relay, sender, recipient, price);

    await relay.connect(carrierA).acceptParcel(parcelId);
    await relay.connect(recipient).openDispute(parcelId);

    await expect(relay.connect(owner).resolveDispute(parcelId))
      .to.emit(relay, "PartialRefund");

    expect(await relay.pendingRefunds(sender.address)).to.equal(price);

    await expect(relay.connect(sender).claimPendingRefund()).to.be.revertedWith("Reserve insuffisante");

    await relay.connect(owner).topUpReserve({ value: price });

    await expect(relay.connect(sender).claimPendingRefund())
      .to.emit(relay, "RefundClaimed");

    expect(await relay.pendingRefunds(sender.address)).to.equal(0n);
  });

  it("naturally resets monthly dispute limit with monthIndex", async function () {
    const { relay, reputation, owner, sender, recipient, carrierA } = await deployFixture();
    const price = ethers.parseEther("0.001");

    await onboard(reputation, owner, carrierA);

    for (let i = 0; i < 3; i += 1) {
      const id = await createAndPayParcel(relay, sender, recipient, price);
      await relay.connect(carrierA).acceptParcel(id);
      await relay.connect(recipient).openDispute(id);
    }

    const id4 = await createAndPayParcel(relay, sender, recipient, price);
    await relay.connect(carrierA).acceptParcel(id4);
    await expect(relay.connect(recipient).openDispute(id4)).to.be.revertedWith("Limite mensuelle atteinte");

    await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    const id5 = await createAndPayParcel(relay, sender, recipient, price);
    await relay.connect(carrierA).acceptParcel(id5);
    await expect(relay.connect(recipient).openDispute(id5)).to.not.be.reverted;
  });

  it("allows recipient to open dispute in Paid only after accept timeout", async function () {
    const { relay, sender, recipient } = await deployFixture();
    const price = ethers.parseEther("1");

    await relay.connect(sender).postParcel(recipient.address, price, "pickup", "dropoff");
    const parcelId = await relay.parcelCount();
    await relay.connect(recipient).payForParcel(parcelId, { value: price });

    await expect(relay.connect(recipient).openDispute(parcelId)).to.be.revertedWith("Delai acceptation non atteint");

    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 2]);
    await ethers.provider.send("evm_mine", []);

    await expect(relay.connect(recipient).openDispute(parcelId)).to.not.be.reverted;
  });

  it("handles dispute timeout with partial reserve and sender debt", async function () {
    const { relay, reputation, owner, sender, recipient, carrierA } = await deployFixture();
    const price = ethers.parseEther("10");
    const reserveTopUp = ethers.parseEther("4");

    await onboard(reputation, owner, carrierA);

    const parcelId = await createAndPayParcel(relay, sender, recipient, price);
    await relay.connect(carrierA).acceptParcel(parcelId);
    await relay.connect(owner).topUpReserve({ value: reserveTopUp });
    await relay.connect(recipient).openDispute(parcelId);

    await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(relay.connect(owner).triggerTimeout(parcelId))
      .to.emit(relay, "PartialRefund");

    const parcel = await relay.parcels(parcelId);
    expect(parcel.status).to.equal(5);
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
    await relay.connect(carrierA).acceptParcel(parcelId);
    await relay.connect(recipient).openDispute(parcelId);

    await relay.connect(owner).resolveDispute(parcelId);
    expect(await relay.pendingRefunds(await attacker.getAddress())).to.equal(price);

    await relay.connect(owner).topUpReserve({ value: price });

    const balanceBefore = await ethers.provider.getBalance(await attacker.getAddress());
    await expect(attacker.connect(owner).attackClaim()).to.not.be.reverted;
    const balanceAfter = await ethers.provider.getBalance(await attacker.getAddress());

    expect(await relay.pendingRefunds(await attacker.getAddress())).to.equal(0n);
    // Verify attacker only received price once (not 2x from reentrancy)
    expect(balanceAfter - balanceBefore).to.equal(price);
  });
});
