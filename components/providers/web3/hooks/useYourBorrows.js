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
  // Top 3 ETH tokens - using Sepolia testnet addresses
  const SUPPORTED_TOKENS = [
    {
      address: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", // WETH on Sepolia
      name: "Wrapped Ethereum",
      symbol: "WETH",
      image: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png"
    },
    {
      address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // USDC on Sepolia
      name: "USD Coin",
      symbol: "USDC",
      image: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png"
    },
    {
      address: "0x7169D38820dfd117C3FA1f22a697dBA58d90BA06", // USDT on Sepolia
      name: "Tether USD",
      symbol: "USDT",
      image: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png"
    }
  ];

  const { address } = useAccount();

  const { data, error, mutate, ...rest } = useSWR(
    () => (web3 && contract && address ? "web3/your_borrows" : null),
    async () => {
      const yourBorrows = [];
      let yourBalance = 0;

      for (let i = 0; i < SUPPORTED_TOKENS.length; i++) {
        const token = SUPPORTED_TOKENS[i];

        try {
          // Get user's borrow information for this asset
          const userBorrow = await contract.methods.userBorrows(address, token.address).call();

          if (userBorrow.principal && userBorrow.principal !== "0") {
            // Calculate current debt with interest
            const accruedInterest = await contract.methods.calculateAccruedInterest(address, token.address).call();
            const totalDebt = BigInt(userBorrow.principal) + BigInt(accruedInterest);

            const borrowData = {
              tokenAddress: token.address,
              name: token.symbol,
              symbol: token.symbol,
              userBorrowedAmount: totalDebt.toString(),
              principal: userBorrow.principal,
              borrowIndex: userBorrow.borrowIndex,
              lastUpdateTimestamp: userBorrow.lastUpdateTimestamp,
              decimals: 18,
              image: token.image
            };

            yourBorrows.push(borrowData);
          }
        } catch (err) {
          console.log(`Error getting borrows for ${token.symbol}:`, err);
        }
      }

      return { yourBorrows, yourBalance };
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
