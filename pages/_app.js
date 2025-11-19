import WagmiProvider from '../components/providers/WagmiProvider'
import { Web3Provider } from "../components/providers";
import '../styles/globals.css'

function MyApp({ Component, pageProps }) {
  return(
    <WagmiProvider>
      <Web3Provider>
        <Component {...pageProps} />
      </Web3Provider>
    </WagmiProvider>
  )
}

export default MyApp
