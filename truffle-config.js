require('babel-register');
require('babel-polyfill');
const path = require("path");
const HDWalletProvider = require('./node_modules/@truffle/hdwallet-provider');
require('./node_modules/dotenv').config();

const MNEMONIC = process.env.MNEMONIC;
const INFURA_API_KEY = process.env.INFURA_API_KEY;
const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_ID;

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*", // Match any network id
      gasPrice: 25000000000
    },
    goerli: {
      provider: () => {
        return new HDWalletProvider(process.env.MNEMONIC, 'https://goerli.infura.io/v3/' + process.env.INFURA_API_KEY)
      },
      network_id: '5', // eslint-disable-line camelcase
      gas: 4465030,
      gasPrice: 10000000000,
    },
      sepolia: {
          provider: ()=>{
              return new HDWalletProvider({
                  mnemonic: MNEMONIC,
                  providerOrUrl: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
                  numberOfAddresses: 1,
                  shareNonce: true,
                  derivationPath: "m/44'/60'/0'/0/"
              })
          },
          gas: 6000000,
          gasPrice: 20000000000, // 20 gwei
          network_id: 11155111,
          networkCheckTimeout: 120000,
          timeoutBlocks: 300,
          deploymentPollingInterval: 10000,
          skipDryRun: true
      }

  },
  contracts_directory: './contracts/',
  contracts_build_directory: './abis/',
  compilers: {
    solc: {
      version: "^0.8.19",
      settings: {
        evmVersion: 'london', // Updated from 'byzantium'
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  },
  mocha: {
    reporter: 'eth-gas-reporter',
  },
  plugins: ["truffle-contract-size"]
}
