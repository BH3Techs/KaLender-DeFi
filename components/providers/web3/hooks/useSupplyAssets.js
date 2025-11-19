import useSWR from "swr";
import { normalizeToken } from "../../../../utils/normalize";
import { useAccount } from 'wagmi';

const NETWORKS = {
  1: "Ethereum Main Network",
  3: "Ropsten Test Network",
  4: "Rinkeby Test Network",
  5: "Goerli Test Network",
  42: "Kovan Test Network",
  56: "Binance Smart Chain",
  1337: "Ganache",
  11155111: "Sepolia Test Network"
};


export const handler = (web3, contract) => () => {
  // Your custom test tokens on Sepolia
  const SUPPORTED_TOKENS = [
    {
      address: "DEPLOY_XPLUG_ADDRESS_HERE", // XPLUG Token (replace after deployment)
      name: "XPLUG Token",
      symbol: "XPLUG",
      image: "https://via.placeholder.com/32x32/10b981/ffffff?text=X"
    },
    {
      address: "DEPLOY_NMB_ADDRESS_HERE", // NMB Token (replace after deployment)
      name: "NMB Token",
      symbol: "NMB",
      image: "https://via.placeholder.com/32x32/3b82f6/ffffff?text=N"
    }
  ];

  const { address } = useAccount();

  const { data, error, mutate, ...rest } = useSWR(
    () => (web3 && contract && address ? "web3/supply_assets" : null),
    async () => {

      const supplyAssets = []

      for (let i = 0; i < SUPPORTED_TOKENS.length; i++){
        const token = SUPPORTED_TOKENS[i]

        try {
          // Get user's wallet balance
          let userBalance = "0";
          if (address) {
            const tokenContract = new web3.eth.Contract(
              [{
                "constant": true,
                "inputs": [{"name": "_owner", "type": "address"}],
                "name": "balanceOf",
                "outputs": [{"name": "balance", "type": "uint256"}],
                "type": "function"
              }],
              token.address
            );
            userBalance = await tokenContract.methods.balanceOf(address).call();
          }

          // Check if pool exists and get pool data
          let poolData;
          let assetPrice = "1"; // Default price
          try {
            poolData = await contract.methods.getPoolData(token.address).call();
            // Try to get real asset price from Chainlink
            try {
              const priceWei = await contract.methods.getAssetPrice(token.address).call();
              assetPrice = web3.utils.fromWei(priceWei, 'ether');
            } catch (priceErr) {
              console.log(`Price feed not available for ${token.symbol}, using default`);
            }
          } catch (err) {
            // Pool doesn't exist yet, use default values
            poolData = {
              supplyAPY: "0",
              borrowAPY: "0",
              totalSupplied: "0",
              totalBorrowed: "0",
              utilizationRate: "0",
              isActive: false
            };
          }

          // Calculate dollar values
          const walletAmountEther = web3.utils.fromWei(userBalance, 'ether');
          const totalSuppliedEther = web3.utils.fromWei(poolData.totalSupplied || "0", 'ether');
          const supplyAPYPercent = web3.utils.fromWei(poolData.supplyAPY || "0", 'ether');
          const borrowAPYPercent = web3.utils.fromWei(poolData.borrowAPY || "0", 'ether');
          const utilizationPercent = web3.utils.fromWei(poolData.utilizationRate || "0", 'ether');

          // Create normalized token object for the new architecture
          const newToken = {
            tokenAddress: token.address,
            name: token.symbol,
            symbol: token.symbol,
            decimals: 18, // Standard ERC20 decimals
            supplyAPY: (parseFloat(supplyAPYPercent) * 100).toFixed(2), // Convert to percentage
            borrowAPY: (parseFloat(borrowAPYPercent) * 100).toFixed(2), // Convert to percentage
            utilizationRate: (parseFloat(utilizationPercent) * 100).toFixed(2), // Convert to percentage
            totalSupplied: poolData.totalSupplied,
            totalBorrowed: poolData.totalBorrowed,
            isActive: poolData.isActive,
            image: token.image,
            walletBalance: {
              amount: walletAmountEther,
              inDollars: (parseFloat(walletAmountEther) * parseFloat(assetPrice)).toFixed(2)
            },
            // Additional properties required by UI components
            availableAmountInContract: {
              amount: totalSuppliedEther,
              inDollars: (parseFloat(totalSuppliedEther) * parseFloat(assetPrice)).toFixed(2)
            },
            oneTokenToDollar: assetPrice, // Real price from Chainlink or default
            userTotalAmountAvailableForBorrowInDollars: "1000" // Mock borrow capacity
          }

          supplyAssets.push(newToken)
        } catch (err) {
          console.log(`Error loading token ${token.symbol}:`, err)
          // For development, add token with minimal data
          const mockToken = {
            tokenAddress: token.address,
            name: token.symbol,
            symbol: token.symbol,
            decimals: 18,
            supplyAPY: "0",
            borrowAPY: "0",
            totalSupplied: "0",
            totalBorrowed: "0",
            isActive: false,
            image: token.image, // Add token image for UI display
            walletBalance: {
              amount: "0",
              inDollars: "0"
            },
            // Additional properties required by UI components
            availableAmountInContract: {
              amount: "0",
              inDollars: "0"
            },
            oneTokenToDollar: "1", // Mock price
            userTotalAmountAvailableForBorrowInDollars: "0" // Mock value
          }
          supplyAssets.push(mockToken)
        }
      }

      return supplyAssets
    }
  );

  const targetNetwork = NETWORKS["11155111"];


  return {
    data,
    error,
    ...rest,
    target: targetNetwork,
    isSupported: data === targetNetwork,
  };
};

/**

web3.eth.net.getId() will return the network id on ganache itself
web3.eth.getChainId() will return the chainId of ganache in metamask.

chainChanged event listens with web3.eth.getChainId()


 */
