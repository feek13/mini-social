'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  Star,
  StarOff,
  Loader2,
  Coins,
  Image as ImageIcon,
  Activity,
  AlertCircle,
} from 'lucide-react'
import { isValidEthereumAddress, formatAddress, CHAIN_CONFIGS } from '@/lib/moralis'
import { ALL_CHAINS } from '@/lib/web3/config'
import { useAuth } from '@/app/providers/AuthProvider'
import WalletStats from '@/components/wallet/WalletStats'
import WalletAssetDistribution from '@/components/wallet/WalletAssetDistribution'
import WalletChainDistribution from '@/components/wallet/WalletChainDistribution'
import WalletDeFiActivity from '@/components/wallet/WalletDeFiActivity'
import WalletLabelsAsync from '@/components/wallet/WalletLabelsAsync'
import WalletSkeleton from '@/components/wallet/WalletSkeleton'
import type {
  WalletOverviewResponse,
  MoralisTokenBalance,
  MoralisNFT,
  MoralisTransaction,
  EvmChain,
} from '@/types/database'

/**
 * 钱包详情页
 * 展示钱包的完整信息：余额、代币、NFT、交易历史等
 */
export default function WalletDetailPage({
  params,
}: {
  params: Promise<{ address: string }>
}) {
  const { address } = use(params)
  const router = useRouter()
  const { user } = useAuth()

  // 状态管理
  const [overview, setOverview] = useState<WalletOverviewResponse | null>(null)
  const [selectedChain, setSelectedChain] = useState<EvmChain>('ethereum')
  const [tokens, setTokens] = useState<MoralisTokenBalance[]>([])
  const [nfts, setNFTs] = useState<MoralisNFT[]>([])
  const [transactions, setTransactions] = useState<MoralisTransaction[]>([])
  const [activeTab, setActiveTab] = useState<'tokens' | 'nfts' | 'transactions'>('tokens')
  const [loading, setLoading] = useState(true)
  const [loadingTab, setLoadingTab] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [isTracked, setIsTracked] = useState(false)
  const [tracking, setTracking] = useState(false)
  const [tokenLimitError, setTokenLimitError] = useState(false)

  // 验证地址格式
  useEffect(() => {
    if (!isValidEthereumAddress(address)) {
      setError('无效的钱包地址格式')
      setLoading(false)
    }
  }, [address])

  // 获取钱包概览 - 只在初次加载时执行
  useEffect(() => {
    const fetchOverview = async () => {
      if (!isValidEthereumAddress(address)) return

      try {
        setLoading(true)
        setError('')

        const headers: HeadersInit = {}
        if (user) {
          const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
          if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`
          }
        }

        const overviewRes = await fetch(`/api/wallet/${address}/overview`, { headers })
        const overviewData = await overviewRes.json()

        if (!overviewRes.ok) {
          throw new Error(overviewData.error || '获取钱包概览失败')
        }

        setOverview(overviewData.data)
        setIsTracked(overviewData.data.is_tracked_by_me)
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取数据失败')
      } finally {
        setLoading(false)
      }
    }

    fetchOverview()
  }, [address, user])

  // 获取指定链的代币
  useEffect(() => {
    const fetchTokens = async () => {
      if (!isValidEthereumAddress(address) || activeTab !== 'tokens') return

      try {
        setLoadingTab(true)
        setTokenLimitError(false)
        const res = await fetch(`/api/wallet/${address}/tokens?chain=${selectedChain}`)
        const data = await res.json()

        if (!res.ok) {
          // 检查是否是 2000+ 代币限制错误
          const errorMsg = data.error || ''
          if (errorMsg.includes('over 2000 tokens') || errorMsg.includes('超过 2000')) {
            setTokenLimitError(true)
            setTokens([]) // 清空代币列表
            return
          }
          throw new Error(data.error || '获取代币失败')
        }

        setTokens(data.data.tokens)
      } catch (err) {
        console.error('获取代币失败:', err)
      } finally {
        setLoadingTab(false)
      }
    }

    fetchTokens()
  }, [address, selectedChain, activeTab])

  // 获取 NFT
  useEffect(() => {
    const fetchNFTs = async () => {
      if (!isValidEthereumAddress(address) || activeTab !== 'nfts') return

      try {
        setLoadingTab(true)
        const res = await fetch(`/api/wallet/${address}/nfts?chain=${selectedChain}&limit=50`)
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || '获取 NFT 失败')
        }

        setNFTs(data.data.nfts)
      } catch (err) {
        console.error('获取 NFT 失败:', err)
      } finally {
        setLoadingTab(false)
      }
    }

    fetchNFTs()
  }, [address, selectedChain, activeTab])

  // 获取交易历史
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!isValidEthereumAddress(address) || activeTab !== 'transactions') return

      try {
        setLoadingTab(true)
        const res = await fetch(`/api/wallet/${address}/transactions?chain=${selectedChain}&limit=25`)
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || '获取交易历史失败')
        }

        setTransactions(data.data.transactions)
      } catch (err) {
        console.error('获取交易历史失败:', err)
      } finally {
        setLoadingTab(false)
      }
    }

    fetchTransactions()
  }, [address, selectedChain, activeTab])

  // 复制地址
  const handleCopy = async () => {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 解析 NFT 图片 URL
  const getNFTImageUrl = (nft: MoralisNFT): string | null => {
    // 1. 尝试从 collection 获取
    if (nft.collection?.image) {
      return nft.collection.image
    }

    // 2. 尝试解析 metadata
    if (nft.metadata) {
      try {
        const metadata = typeof nft.metadata === 'string'
          ? JSON.parse(nft.metadata)
          : nft.metadata

        // 支持常见的 image 字段名
        const imageUrl = metadata.image || metadata.image_url || metadata.imageUrl
        if (imageUrl) {
          // 处理 IPFS 链接
          if (imageUrl.startsWith('ipfs://')) {
            return imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/')
          }
          return imageUrl
        }
      } catch (e) {
        console.log('解析 NFT metadata 失败:', e)
      }
    }

    // 3. 尝试使用 token_uri（可能需要额外请求，这里不实现）
    return null
  }

  // 追踪/取消追踪钱包
  const handleTrack = async () => {
    if (!user) {
      alert('请先登录')
      return
    }

    try {
      setTracking(true)
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()

      if (isTracked) {
        // 取消追踪 - 需要先获取 tracker ID
        // 这里简化处理，实际应该从 overview 中获取
        alert('取消追踪功能待完善')
      } else {
        // 创建追踪
        const res = await fetch('/api/wallet/trackers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            wallet_address: address,
            notification_enabled: true,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || '追踪失败')
        }

        setIsTracked(true)
        alert('追踪成功！')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败')
    } finally {
      setTracking(false)
    }
  }

  // 加载中 - 显示骨架屏而不是空白页面
  if (loading && !overview) {
    return <WalletSkeleton />
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            加载失败
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => router.push('/wallet')}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
          >
            返回搜索
          </button>
        </div>
      </div>
    )
  }

  if (!overview) {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* 返回按钮 */}
      <button
        onClick={() => router.push('/wallet')}
        className="mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        返回搜索
      </button>

      {/* 钱包头部信息 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              钱包分析
            </h1>
            <div className="flex items-center gap-2 mb-2">
              <p className="font-mono text-sm text-gray-600 dark:text-gray-400 truncate">
                {address}
              </p>
              <button
                onClick={handleCopy}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
              <a
                href={`https://etherscan.io/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </a>
            </div>

            {/* 智能标签 - 异步加载不阻塞 */}
            <div className="mt-3">
              <WalletLabelsAsync address={address} chain={selectedChain} />
            </div>
          </div>

          {/* 追踪按钮 */}
          {user && (
            <button
              onClick={handleTrack}
              disabled={tracking}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isTracked
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-300'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {tracking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isTracked ? (
                <>
                  <Star className="w-4 h-4 fill-current" />
                  已追踪
                </>
              ) : (
                <>
                  <StarOff className="w-4 h-4" />
                  追踪
                </>
              )}
            </button>
          )}
        </div>

        {/* 统计数据 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">总链数</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {overview.chains.length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">代币种类</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {overview.chains.reduce((sum, c) => sum + c.tokens.length, 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">NFT 数量</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {overview.chains.reduce((sum, c) => sum + c.nfts_count, 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">被追踪</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {overview.tracker_count} 人
            </p>
          </div>
        </div>
      </div>

      {/* 钱包统计分析 */}
      <WalletStats
        totalValue={overview.total_value_usd}
        tokens={overview.chains.flatMap((c) => c.tokens)}
        transactions={transactions}
        chains={overview.chains.map((c) => ({
          chain: c.chain,
          balance_usd: c.balance_usd,
          tokens_count: c.tokens.length,
          nfts_count: c.nfts_count,
        }))}
      />

      {/* 可视化面板 */}
      <div className="grid md:grid-cols-2 gap-6 my-6">
        {/* 资产分布 */}
        <WalletAssetDistribution
          tokens={overview.chains.flatMap((c) => c.tokens)}
          nativeBalance={
            overview.native_balance
              ? {
                  symbol: overview.native_balance.symbol,
                  balance: overview.native_balance.balance,
                  usd_value: overview.chains.find((c) => c.chain === 'ethereum')?.balance_usd || 0,
                }
              : undefined
          }
        />

        {/* 链分布 */}
        <WalletChainDistribution
          chains={overview.chains.map((c) => ({
            chain: c.chain,
            balance_usd: c.balance_usd,
            tokens_count: c.tokens.length,
            nfts_count: c.nfts_count,
          }))}
        />
      </div>

      {/* DeFi 协议交互 */}
      {transactions.length > 0 && (
        <div className="mb-6">
          <WalletDeFiActivity transactions={transactions} chain={selectedChain} />
        </div>
      )}

      {/* 链选择器 - 显示所有支持的链 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-6">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">选择链查看详细数据：</p>
        <div className="flex flex-wrap gap-2">
          {ALL_CHAINS.map((chain) => {
            // 检查该链是否有数据
            const chainData = overview.chains.find((c) => c.chain === chain)
            const hasData = !!chainData
            const tokenCount = chainData?.tokens.length || 0

            return (
              <button
                key={chain}
                onClick={() => setSelectedChain(chain)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedChain === chain
                    ? 'bg-blue-500 text-white'
                    : hasData
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {CHAIN_CONFIGS[chain].name}
                <span className="ml-2 text-xs opacity-75">
                  {hasData ? `(${tokenCount})` : '(无数据)'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 标签页 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        {/* 标签页头部 */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('tokens')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'tokens'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Coins className="w-4 h-4" />
              代币
            </div>
          </button>
          <button
            onClick={() => setActiveTab('nfts')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'nfts'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <ImageIcon className="w-4 h-4" />
              NFT
            </div>
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'transactions'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Activity className="w-4 h-4" />
              交易
            </div>
          </button>
        </div>

        {/* 标签页内容 */}
        <div className="p-6 min-h-[400px]">
          {loadingTab ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              {/* 代币列表 */}
              {activeTab === 'tokens' && (
                <div className="space-y-3">
                  {tokenLimitError ? (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                            代币数量超出限制
                          </h3>
                          <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-3">
                            此钱包包含超过 2,000 个代币，受 Moralis API 限制无法完整展示。
                          </p>
                          <div className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
                            <p>• 这通常是巨鲸钱包或交易所钱包的特征</p>
                            <p>• 您仍可以查看该钱包的 NFT 和交易历史</p>
                            <p>• 如需完整数据，请联系 Moralis 支持升级 API 计划</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : tokens.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                      该链上暂无代币
                    </p>
                  ) : (
                    tokens.map((token: any) => {
                      // 兼容不同的字段命名：API返回 token_name/token_symbol/thumbnail，类型定义是 name/symbol/logo
                      const tokenName = token.token_name || token.name || 'Unknown Token'
                      const tokenSymbol = token.token_symbol || token.symbol || '???'
                      const tokenLogo = token.thumbnail || token.logo
                      const balance = token.balance_formatted || '0'
                      const usdValue = token.usd_value || 0

                      return (
                        <div
                          key={token.token_address}
                          className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700
                                   hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {tokenLogo ? (
                              <img
                                src={tokenLogo}
                                alt={tokenSymbol}
                                className="w-10 h-10 rounded-full flex-shrink-0"
                                onError={(e) => {
                                  // 图片加载失败时隐藏
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs font-bold">
                                  {tokenSymbol.slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white truncate">
                                {tokenName}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {tokenSymbol}
                              </p>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {parseFloat(balance).toLocaleString(undefined, {
                                maximumFractionDigits: 6,
                              })}
                            </p>
                            {usdValue > 0 ? (
                              <p className="text-sm text-green-600 dark:text-green-400">
                                ${usdValue.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </p>
                            ) : (
                              token.possible_spam && (
                                <span className="text-xs text-red-500">可疑</span>
                              )
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {/* NFT 列表 */}
              {activeTab === 'nfts' && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {nfts.length === 0 ? (
                    <p className="col-span-full text-center text-gray-500 dark:text-gray-400 py-8">
                      该链上暂无 NFT
                    </p>
                  ) : (
                    nfts.map((nft, index) => {
                      const imageUrl = getNFTImageUrl(nft)

                      return (
                        <div
                          key={`${nft.token_address || 'nft'}-${nft.token_id || index}`}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden
                                   hover:shadow-lg transition-shadow cursor-pointer group"
                        >
                          <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={nft.name || 'NFT'}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  // 图片加载失败时显示占位图标
                                  e.currentTarget.style.display = 'none'
                                  const parent = e.currentTarget.parentElement
                                  if (parent) {
                                    const icon = document.createElement('div')
                                    icon.className = 'w-full h-full flex items-center justify-center'
                                    icon.innerHTML = '<svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>'
                                    parent.appendChild(icon)
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-12 h-12 text-gray-400" />
                              </div>
                            )}
                            {nft.possible_spam && (
                              <div className="absolute top-2 right-2">
                                <span className="px-2 py-1 text-xs font-medium bg-red-500 text-white rounded-md">
                                  可疑
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                              {nft.name || nft.collection?.name || 'Unnamed'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              #{nft.token_id}
                            </p>
                            {nft.collection?.verified && (
                              <span className="inline-flex items-center mt-1 text-xs text-blue-600 dark:text-blue-400">
                                <Check className="w-3 h-3 mr-1" />
                                已验证
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {/* 交易历史 */}
              {activeTab === 'transactions' && (
                <div className="space-y-3">
                  {transactions.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                      暂无交易记录
                    </p>
                  ) : (
                    transactions.map((tx: any) => {
                      // 兼容不同的数据格式
                      const isSuccess = tx.status === 'success' || tx.receipt_status === '1' || tx.status === undefined
                      const timestamp = tx.block_timestamp || tx.timestamp
                      const isIncoming = tx.to_address?.toLowerCase() === address.toLowerCase()

                      return (
                        <div
                          key={tx.hash}
                          className="p-4 rounded-lg border border-gray-200 dark:border-gray-700
                                   hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-mono text-gray-600 dark:text-gray-400 truncate">
                                  {tx.hash}
                                </p>
                                <a
                                  href={`https://etherscan.io/tx/${tx.hash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-shrink-0"
                                >
                                  <ExternalLink className="w-3 h-3 text-gray-400 hover:text-blue-500" />
                                </a>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {timestamp ? new Date(timestamp).toLocaleString('zh-CN') : '未知时间'}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded ${
                                  isSuccess
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                }`}
                              >
                                {isSuccess ? '成功' : '失败'}
                              </span>
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded ${
                                  isIncoming
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                }`}
                              >
                                {isIncoming ? '接收' : '发送'}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">From: </span>
                              <span className="font-mono text-gray-700 dark:text-gray-300">
                                {tx.from_address.slice(0, 6)}...{tx.from_address.slice(-4)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">To: </span>
                              <span className="font-mono text-gray-700 dark:text-gray-300">
                                {tx.to_address
                                  ? `${tx.to_address.slice(0, 6)}...${tx.to_address.slice(-4)}`
                                  : 'Contract Creation'}
                              </span>
                            </div>
                          </div>
                          {tx.value && parseFloat(tx.value) > 0 && (
                            <div className="mt-2 text-sm">
                              <span className="text-gray-500 dark:text-gray-400">Value: </span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {(parseFloat(tx.value) / 1e18).toFixed(6)} ETH
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
