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
    () => (web3 && contract && address ? "web3/your_supplies" : null),
    async () => {
      const yourSupplies = [];
      let yourBalance = 0;

      for (let i = 0; i < SUPPORTED_TOKENS.length; i++) {
        const token = SUPPORTED_TOKENS[i];

        try {
          // Get pool information
          const poolInfo = await contract.methods.pools(token.address).call();

          if (poolInfo.poolToken && poolInfo.poolToken !== "0x0000000000000000000000000000000000000000") {
            // Get user's pool token balance
            const poolTokenContract = new web3.eth.Contract(
              [{
                "constant": true,
                "inputs": [{"name": "_owner", "type": "address"}],
                "name": "balanceOf",
                "outputs": [{"name": "balance", "type": "uint256"}],
                "type": "function"
              }],
              poolInfo.poolToken
            );

            const userPoolTokens = await poolTokenContract.methods.balanceOf(address).call();

            if (userPoolTokens && userPoolTokens !== "0") {
              // User has supplies in this pool
              const supplyData = {
                tokenAddress: token.address,
                name: token.symbol,
                symbol: token.symbol,
                userSuppliedAmount: userPoolTokens, // Pool tokens represent supplied amount
                decimals: 18,
                image: token.image
              };

              yourSupplies.push(supplyData);
            }
          }
        } catch (err) {
          console.log(`Error getting supplies for ${token.symbol}:`, err);
        }
      }

      return { yourSupplies, yourBalance };
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
