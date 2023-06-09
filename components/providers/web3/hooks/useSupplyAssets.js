import useSWR from "swr";
import { normalizeToken } from "../../../../utils/normalize"

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


  const { data, error, mutate, ...rest } = useSWR(
    () => (web3 ? "web3/supply_assets" : null),
    async () => {

      const supplyAssets = []

    //all the tokens for lending

      const tokens = await contract.methods.getTokensForLendingArray().call()
      console.log("All tokens "+tokens.length)

      for (let i = 0; i < tokens.length; i++){
        const currentToken = tokens[i]
        console.log("ONE"+i)
        const newToken = await normalizeToken(web3, contract, currentToken)
        
        //You can actually see the token information coming here
        supplyAssets.push(newToken)

        console.log("ONE"+i)

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
