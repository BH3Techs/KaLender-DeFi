import React, { useState } from 'react'
import { useConnect, useAccount, useDisconnect, useNetwork } from 'wagmi'

export default function WalletManager() {
  const { connect, connectors, error, isLoading, pendingConnector } = useConnect()
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { chain } = useNetwork()

  const [showModal, setShowModal] = useState(false)

  const supportedWallets = [
    {
      name: 'MetaMask',
      id: 'metaMask',
      icon: '🦊',
      description: 'Connect using MetaMask browser extension'
    },
    {
      name: 'WalletConnect',
      id: 'walletConnect',
      icon: '🔗',
      description: 'Scan QR code with your mobile wallet'
    },
    {
      name: 'Coinbase Wallet',
      id: 'coinbaseWallet',
      icon: '🔵',
      description: 'Connect using Coinbase Wallet'
    }
  ]

  if (isConnected) {
    return (
      <div className='flex items-center space-x-4'>
        <div className='flex items-center space-x-2'>
          <div className='w-3 h-3 bg-green-400 rounded-full'></div>
          <span className='text-sm text-gray-600'>
            {chain?.name || 'Connected'}
          </span>
        </div>
        <div className='px-4 py-2 text-white bg-gray-800 border border-gray-400 rounded-md'>
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </div>
        <button
          onClick={() => disconnect()}
          className='px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50'
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className='px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors'
      >
        Connect Wallet
      </button>

      {showModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
          <div className='bg-white rounded-lg p-6 max-w-md w-full mx-4'>
            <div className='flex justify-between items-center mb-6'>
              <h2 className='text-xl font-semibold'>Connect Your Wallet</h2>
              <button
                onClick={() => setShowModal(false)}
                className='text-gray-500 hover:text-gray-700'
              >
                ✕
              </button>
            </div>

            <div className='space-y-3'>
              {supportedWallets.map(wallet => {
                const connector = connectors.find(c => c.id === wallet.id)
                return (
                  <button
                    key={wallet.id}
                    onClick={() => {
                      if (connector) {
                        connect({ connector })
                        setShowModal(false)
                      }
                    }}
                    disabled={!connector || isLoading}
                    className='w-full flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50'
                  >
                    <span className='text-2xl'>{wallet.icon}</span>
                    <div className='text-left'>
                      <div className='font-medium'>{wallet.name}</div>
                      <div className='text-sm text-gray-500'>{wallet.description}</div>
                    </div>
                    {isLoading && pendingConnector?.id === wallet.id && (
                      <div className='ml-auto animate-spin'>⚡</div>
                    )}
                  </button>
                )
              })}
            </div>

            {error && (
              <div className='mt-4 p-3 bg-red-50 border border-red-200 rounded-lg'>
                <p className='text-red-600 text-sm'>{error.message}</p>
              </div>
            )}

            <div className='mt-6 text-center'>
              <p className='text-sm text-gray-500'>
                By connecting, you agree to our Terms of Service
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}