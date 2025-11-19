import { WagmiConfig } from 'wagmi'
import { config } from '../wallet/WalletConfig'

export default function WagmiProvider({ children }) {
  return (
    <WagmiConfig config={config}>
      {children}
    </WagmiConfig>
  )
}