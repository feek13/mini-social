import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import type { Config } from 'wagmi'
import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  bsc,
  sepolia,
} from 'wagmi/chains'

// 使用单例模式确保配置只被创建一次
let wagmiConfigInstance: Config | undefined

export const config = (() => {
  if (!wagmiConfigInstance) {
    wagmiConfigInstance = getDefaultConfig({
      appName: 'MiniSocial',
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID as string,
      chains: [
        mainnet,
        base,
        arbitrum,
        optimism,
        polygon,
        bsc,
        ...(process.env.NODE_ENV === 'development' ? [sepolia] : []),
      ],
      ssr: true, // Next.js SSR support
    })
  }
  return wagmiConfigInstance
})()
