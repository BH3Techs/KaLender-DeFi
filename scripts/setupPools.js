const LendingAndBorrowing = artifacts.require("LendingAndBorrowing");

module.exports = async function(callback) {
  try {
    const lendingContract = await LendingAndBorrowing.deployed();
    console.log("Setting up asset pools...");

    // Example: Create DAI pool
    // You'll need actual token addresses on Sepolia
    const daiAddress = "0x..."; // Replace with actual DAI address on Sepolia
    const daiPriceFeed = "0x..."; // Replace with Chainlink DAI/USD feed on Sepolia

    await lendingContract.createAssetPool(
      daiAddress,                    // asset
      "KaLender DAI",               // poolTokenName
      "kDAI",                       // poolTokenSymbol
      8000,                         // ltv (80%)
      8500,                         // liquidationThreshold (85%)
      1000,                         // reserveFactor (10%)
      daiPriceFeed                  // priceFeed
    );

    console.log("DAI pool created!");

    // Add more pools for other assets (USDC, WETH, etc.)

    console.log("Pool setup complete!");
    callback();
  } catch (error) {
    console.error(error);
    callback(error);
  }
};