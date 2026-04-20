const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CarrierReputation v2.1", function () {
  async function deployFixture() {
    const [owner, relay, carrier, other] = await ethers.getSigners();
    const Reputation = await ethers.getContractFactory("CarrierReputation");
    const reputation = await Reputation.deploy();
    await reputation.waitForDeployment();
    return { reputation, owner, relay, carrier, other };
  }

  it("allows owner onboarding with initial points", async function () {
    const { reputation, carrier } = await deployFixture();

    await reputation.onboardCarrier(carrier.address);
    const points = await reputation.getPoints(carrier.address);

    expect(points).to.equal(ethers.parseEther("10"));
  });

  it("restricts addPoints/deductPoints to relay contract", async function () {
    const { reputation, relay, carrier, other } = await deployFixture();

    await reputation.setRelayContract(relay.address);

    await expect(
      reputation.connect(other).addPoints(carrier.address, 1n)
    ).to.be.revertedWith("Only relay");

    await expect(
      reputation.connect(relay).addPoints(carrier.address, 5n)
    ).to.not.be.reverted;

    expect(await reputation.getPoints(carrier.address)).to.equal(5n);

    await expect(
      reputation.connect(relay).deductPoints(carrier.address, 3n)
    ).to.not.be.reverted;

    expect(await reputation.getPoints(carrier.address)).to.equal(2n);
  });

  it("updates tier based on delivery + ratings + verification", async function () {
    const { reputation, relay, carrier } = await deployFixture();
    await reputation.setRelayContract(relay.address);
    await reputation.verifyCarrier(carrier.address);

    for (let i = 0; i < 10; i += 1) {
      await reputation.connect(relay).addPoints(carrier.address, 1n);
      await reputation.submitRating(carrier.address, 5);
    }

    expect(await reputation.getTier(carrier.address)).to.equal(2);
  });
});
