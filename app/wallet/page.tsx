'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, TrendingUp, Wallet as WalletIcon, Info, ArrowLeft, Home } from 'lucide-react'
import { isValidEthereumAddress } from '@/lib/moralis'

/**
 * 钱包搜索主页
 * 用户可以输入任意 EVM 钱包地址进行查询
 */
export default function WalletSearchPage() {
  const router = useRouter()
  const [address, setAddress] = useState('')
  const [error, setError] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedAddress = address.trim()

    // 验证地址格式
    if (!trimmedAddress) {
      setError('请输入钱包地址')
      return
    }

    if (!isValidEthereumAddress(trimmedAddress)) {
      setError('无效的钱包地址格式（必须是 0x 开头的 42 位十六进制地址）')
      return
    }

    // 跳转到钱包详情页
    router.push(`/wallet/${trimmedAddress}`)
  }

  const exampleAddresses = [
    {
      name: 'Vitalik Buterin',
      address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      label: '以太坊创始人',
    },
    {
      name: 'Binance Hot Wallet',
      address: '0xF977814e90dA44bFA03b6295A0616a897441aceC',
      label: '交易所热钱包',
    },
    {
      name: 'USDC Treasury',
      address: '0x55FE002aefF02F77364de339a1292923A15844B8',
      label: 'USDC 储备',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* 返回首页按钮 */}
        <button
          onClick={() => router.push('/')}
          className="mb-6 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">返回首页</span>
        </button>

        {/* 页面标题 */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <WalletIcon className="w-12 h-12 text-blue-500" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            钱包分析浏览器
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            查询任意 EVM 钱包地址，查看多链资产、交易历史和智能标签
          </p>
        </div>

        {/* 搜索框 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value)
                  setError('')
                }}
                placeholder="输入钱包地址 (0x...)"
                className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 dark:border-gray-700 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white
                         placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            <button
              type="submit"
              className="w-full mt-4 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium
                       rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" />
              搜索钱包
            </button>
          </form>
        </div>

        {/* 功能介绍 */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <WalletIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">多链支持</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              支持 12+ EVM 链，包括 Ethereum、BSC、Polygon、Arbitrum 等
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">实时数据</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              实时查询代币余额、NFT 资产、交易历史等链上数据
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Info className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">智能标签</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              自动识别巨鲸、交易所、DeFi 用户等钱包类型
            </p>
          </div>
        </div>

        {/* 示例地址 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            示例地址
          </h2>
          <div className="space-y-3">
            {exampleAddresses.map((example) => (
              <button
                key={example.address}
                onClick={() => router.push(`/wallet/${example.address}`)}
                className="w-full text-left p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700
                         hover:border-blue-500 dark:hover:border-blue-500 transition-colors duration-200
                         group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {example.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-mono truncate">
                      {example.address}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {example.label}
                    </p>
                  </div>
                  <Search className="w-5 h-5 text-gray-400 group-hover:text-blue-500 flex-shrink-0 ml-2" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 说明文本 */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            提示：所有 EVM 链使用相同的地址格式，搜索一次即可查看该地址在所有链上的资产
          </p>
          <p className="mt-2">
            数据来源：Moralis API | 仅显示公开的链上信息
          </p>
        </div>
      </div>
    </div>
  )
}
