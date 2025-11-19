const LiquidationEngine = artifacts.require("LiquidationEngine");
const LendingAndBorrowing = artifacts.require("LendingAndBorrowing");

module.exports = async function(deployer, network, accounts) {
  console.log("Deploying LiquidationEngine...");

  const lendingContract = await LendingAndBorrowing.deployed();
  console.log("LendingAndBorrowing found at:", lendingContract.address);

  await deployer.deploy(LiquidationEngine, lendingContract.address);
  const liquidationEngine = await LiquidationEngine.deployed();
  console.log("LiquidationEngine deployed to:", liquidationEngine.address);

  // Configure the lending contract
  console.log("Configuring liquidation engine...");
  await lendingContract.setLiquidationEngine(liquidationEngine.address);

  console.log("\\n=== DEPLOYMENT COMPLETE ===");
  console.log("LiquidationEngine:", liquidationEngine.address);
  console.log("=============================\\n");
};