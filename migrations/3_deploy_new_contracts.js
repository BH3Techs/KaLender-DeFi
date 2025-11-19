const InterestRateModel = artifacts.require("InterestRateModel");
const LiquidationEngine = artifacts.require("LiquidationEngine");
const PoolShareToken = artifacts.require("PoolShareToken");
const LendingAndBorrowing = artifacts.require("LendingAndBorrowing");

module.exports = async function(deployer, network, accounts) {
  // Deploy Interest Rate Model
  console.log("Deploying InterestRateModel...");
  await deployer.deploy(InterestRateModel);
  const interestRateModel = await InterestRateModel.deployed();
  console.log("InterestRateModel deployed to:", interestRateModel.address);

  // Set treasury address (using deployer as treasury for now)
  const treasury = accounts[0];

  // Deploy main Lending contract
  console.log("Deploying LendingAndBorrowing...");
  await deployer.deploy(
    LendingAndBorrowing,
    interestRateModel.address,
    treasury
  );
  const lendingContract = await LendingAndBorrowing.deployed();
  console.log("LendingAndBorrowing deployed to:", lendingContract.address);

  // Deploy Liquidation Engine
  console.log("Deploying LiquidationEngine...");
  await deployer.deploy(LiquidationEngine, lendingContract.address);
  const liquidationEngine = await LiquidationEngine.deployed();
  console.log("LiquidationEngine deployed to:", liquidationEngine.address);

  // Configure the lending contract
  console.log("Configuring contracts...");
  await lendingContract.setLiquidationEngine(liquidationEngine.address);

  console.log("\\n=== Deployment Summary ===");
  console.log("InterestRateModel:", interestRateModel.address);
  console.log("LendingAndBorrowing:", lendingContract.address);
  console.log("LiquidationEngine:", liquidationEngine.address);
  console.log("Treasury:", treasury);
  console.log("========================\\n");
};