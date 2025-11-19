import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { setupHooks } from "./hooks/setupHooks";
import { loadContract } from "../../../utils/loadContract";
import LendingContract from "../../../abis/LendingAndBorrowing.json";

const Web3Context = createContext(null);

export default function Web3Provider({ children }) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const createWeb3State = ({ web3, provider, contract, isLoading }) => {
    return {
      web3,
      provider,
      contract,
      isLoading,
      hooks: setupHooks({ web3, provider, contract }),
    };
  };

  const [web3Api, setWeb3Api] = useState(
    createWeb3State({
      web3: null,
      provider: null,
      contract: null,
      isLoading: true,
    })
  );

  useEffect(() => {
    const loadProvider = async () => {
      if (walletClient && publicClient) {
        // Create a Web3-compatible provider from wagmi clients
        const provider = walletClient;
        const web3 = {
          eth: {
            net: { getId: () => publicClient.chain.id },
            Contract: function(abi, address) {
              // Simplified contract interface for compatibility
              return {
                options: { address },
                methods: {}
              };
            }
          },
          utils: {
            toWei: (value) => BigInt(value) * BigInt(10**18)
          }
        };

        // Load the actual contract with proper ABI and methods
        const contractAddress = process.env.LENDING_CONTRACT_ADDRESS || '0x338634D7D45feC2fB9eC061BEF83628fe3DDB9D4';
        const contract = new web3.eth.Contract(LendingContract.abi, contractAddress);

        setWeb3Api(
          createWeb3State({ web3, provider, contract, isLoading: false })
        );
      } else if (!isConnected) {
        setWeb3Api(
          createWeb3State({
            web3: null,
            provider: null,
            contract: null,
            isLoading: false,
          })
        );
      }
    };

    loadProvider();
  }, [walletClient, publicClient, isConnected]);

  const _web3Api = useMemo(() => {
    const { web3, provider, isLoading, contract } = web3Api;

    return {
      ...web3Api,
      requireInstall: !isLoading && !isConnected,
      connect: () => console.log("Use wagmi wallet connection"),
    };
  }, [web3Api, isConnected]);

  // Return another instance of _web3Api if web3Api changes

  return (
    <Web3Context.Provider value={_web3Api}>{children}</Web3Context.Provider>
  );
}

export function useWeb3() {
  return useContext(Web3Context);
}

export function useHooks(callback) {
  const { hooks } = useWeb3();
  return callback(hooks);
}

/*

getHooks() method returns a dictionary containing name of the hook (key) and the handler to the hook (value)
That dictionary will be accessible anywhere useHooks() method is called because the dictionary is passed as an argument to the callback.

*/
