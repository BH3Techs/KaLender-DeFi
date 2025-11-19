import useSWR from "swr";
import { useEffect } from "react";

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

export const handler = (web3) => () => {

  const { data, error, mutate, ...rest } = useSWR(
    () => (web3 ? "web3/network" : null),
    async () => {
      const chainId = await web3.eth.getChainId();

      if (!chainId) {
        throw new Error("Cannot retrieve network. Please reload your browser")

      }
      return {
        chainId: chainId,
        name: NETWORKS[chainId]
      };
    }
  );

  const targetChainId = 11155111;
  const targetNetwork = NETWORKS[targetChainId];


  return {
    data,
    error,
    ...rest,
    target: targetNetwork,
    isSupported: data?.chainId === targetChainId,
  };
};

/**

web3.eth.net.getId() will return the network id on ganache itself
web3.eth.getChainId() will return the chainId of ganache in metamask.

chainChanged event listens with web3.eth.getChainId()


 */
