'use client'

/**
 * DeFi 协议外部链接组件
 * 提供到 Etherscan、官网等的快速链接
 */

import { ExternalLink, FileCode, Globe } from 'lucide-react'
import { SUPPORTED_CHAINS } from '@/lib/etherscan/types'

interface ExternalLinksProps {
  protocolName: string
  url?: string | null
  address?: string | null
  chain?: string
  className?: string
}

export default function ExternalLinks({
  protocolName,
  url,
  address,
  chain = 'Ethereum',
  className = '',
}: ExternalLinksProps) {
  // 获取 Etherscan URL
  const getEtherscanUrl = () => {
    const chainLower = chain.toLowerCase()

    // 根据链名称返回相应的浏览器 URL
    if (chainLower.includes('ethereum') || chainLower === 'eth') {
      return 'https://etherscan.io'
    } else if (chainLower.includes('bsc') || chainLower.includes('binance')) {
      return 'https://bscscan.com'
    } else if (chainLower.includes('polygon')) {
      return 'https://polygonscan.com'
    } else if (chainLower.includes('arbitrum')) {
      return 'https://arbiscan.io'
    } else if (chainLower.includes('optimism')) {
      return 'https://optimistic.etherscan.io'
    } else if (chainLower.includes('base')) {
      return 'https://basescan.org'
    }

    // 默认返回 Etherscan
    return 'https://etherscan.io'
  }

  const etherscanBaseUrl = getEtherscanUrl()

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {/* 官网链接 */}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <Globe className="w-4 h-4" />
          访问官网
          <ExternalLink className="w-3 h-3" />
        </a>
      )}

      {/* 合约地址链接 */}
      {address && (
        <a
          href={`${etherscanBaseUrl}/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <FileCode className="w-4 h-4" />
          查看合约
          <ExternalLink className="w-3 h-3" />
        </a>
      )}

      {/* Etherscan 搜索链接（当没有合约地址时） */}
      {!address && (
        <a
          href={`${etherscanBaseUrl}/search?q=${encodeURIComponent(protocolName)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <FileCode className="w-4 h-4" />
          搜索链上数据
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  )
}
