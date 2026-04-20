const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const Reputation = await hre.ethers.getContractFactory("CarrierReputation");
  const reputation = await Reputation.deploy();
  await reputation.waitForDeployment();
  const reputationAddress = await reputation.getAddress();

  const Relay = await hre.ethers.getContractFactory("RelayEscrow");
  const relay = await Relay.deploy(reputationAddress);
  await relay.waitForDeployment();
  const relayAddress = await relay.getAddress();

  await reputation.setRelayContract(relayAddress);

  const networkName = hre.network.name;
  const payload = {
    network: networkName,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      CarrierReputation: reputationAddress,
      RelayEscrow: relayAddress
    }
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });
  const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(payload, null, 2));

  console.log("CarrierReputation:", reputationAddress);
  console.log("RelayEscrow      :", relayAddress);
  console.log("Deployment file  :", deploymentFile);

  if (process.env.SYNC_FRONTEND_ADDRESSES === "true") {
    const frontendAddressesPath = path.join(
      __dirname,
      "..",
      "frontend",
      "src",
      "config",
      "addresses.js"
    );
    const fileContent = [
      `export const RELAY_ADDRESS = \"${relayAddress}\";`,
      `export const REP_ADDRESS = \"${reputationAddress}\";`,
      ""
    ].join("\n");

    fs.writeFileSync(frontendAddressesPath, fileContent);
    console.log("Frontend addresses synced to:", frontendAddressesPath);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
