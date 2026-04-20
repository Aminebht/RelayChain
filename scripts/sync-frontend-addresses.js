const fs = require("fs");
const path = require("path");

function main() {
  const network = process.argv[2] || "localhost";
  const deploymentPath = path.join(__dirname, "..", "deployments", `${network}.json`);

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(
      `Deployment file not found: ${deploymentPath}. Run deploy first (npm run deploy:${network === "localhost" ? "local" : "<network>"}).`
    );
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const relayAddress = deployment?.contracts?.RelayEscrow;
  const repAddress = deployment?.contracts?.CarrierReputation;

  if (!relayAddress || !repAddress) {
    throw new Error(`Invalid deployment file format in ${deploymentPath}`);
  }

  const targetPath = path.join(
    __dirname,
    "..",
    "frontend",
    "src",
    "config",
    "addresses.js"
  );

  const content = [
    `export const RELAY_ADDRESS = \"${relayAddress}\";`,
    `export const REP_ADDRESS = \"${repAddress}\";`,
    ""
  ].join("\n");

  fs.writeFileSync(targetPath, content);

  console.log(`Synced frontend addresses from ${deploymentPath}`);
  console.log(`Updated ${targetPath}`);
  console.log(`RelayEscrow: ${relayAddress}`);
  console.log(`CarrierReputation: ${repAddress}`);
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
