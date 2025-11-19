import { configureChains, createConfig } from 'wagmi'
import { sepolia, mainnet } from 'wagmi/chains'
import { publicProvider } from 'wagmi/providers/public'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { MetaMaskConnector } from 'wagmi/connectors/metaMask'
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect'
import { CoinbaseWalletConnector } from 'wagmi/connectors/coinbaseWallet'

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [sepolia, mainnet],
  [
    alchemyProvider({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_ID || 'demo' }),
    publicProvider(),
  ]
)

const config = createConfig({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({
      chains,
      options: {
        UNSTABLE_shimOnConnectSelectAccount: true,
      }
    }),
    new WalletConnectConnector({
      chains,
      options: {
        projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo',
      },
    }),
    new CoinbaseWalletConnector({
      chains,
      options: {
        appName: 'KaLender DeFi',
        appLogoUrl: '/logo.png',
      },
    }),
  ],
  publicClient,
  webSocketPublicClient,
})

export { config, chains }