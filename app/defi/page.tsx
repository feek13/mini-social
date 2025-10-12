'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Filter, TrendingUp, DollarSign, BarChart3, X, AlertCircle, Zap, Shield, Coins, Copy, Check, Flame, Star, Rocket, ArrowUpDown, ChevronDown, ChevronUp, Activity, Wifi, WifiOff } from 'lucide-react'
import Navbar from '@/components/Navbar'
import ProtocolCard from '@/components/defi/ProtocolCard'
import YieldCard from '@/components/defi/YieldCard'
import { Protocol, YieldPool, TokenPrice, Chain } from '@/lib/defillama/types'
import { useDebounce } from '@/hooks/useDebounce'
import { formatTokenPrice, formatTimestamp, formatTVL } from '@/lib/utils'
import { BinanceWebSocketClient, getSymbolForToken, BinanceTicker, COMMON_SYMBOLS } from '@/lib/binance-websocket'

type Tab = 'protocols' | 'yields' | 'prices'
type SortOption = 'tvl_desc' | 'tvl_asc' | 'change_1d_desc' | 'change_7d_desc'

// 常见分类
const CATEGORIES = [
  'Dexes',
  'Lending',
  'Yield',
  'Bridge',
  'Liquid Staking',
  'CDP',
  'Derivatives',
  'Yield Aggregator',
]

// TVL 范围选项
const TVL_RANGES = [
  { label: '全部', min: 0, max: Infinity },
  { label: '$1M+', min: 1_000_000, max: Infinity },
  { label: '$10M+', min: 10_000_000, max: Infinity },
  { label: '$100M+', min: 100_000_000, max: Infinity },
  { label: '$1B+', min: 1_000_000_000, max: Infinity },
]

// 协议快捷筛选选项
const PROTOCOL_QUICK_FILTERS = [
  { label: '热门 Top 10', icon: Flame, limit: 10, sortBy: 'tvl_desc' as SortOption },
  { label: 'Top 50', icon: Star, limit: 50, sortBy: 'tvl_desc' as SortOption },
  { label: 'TVL $1B+', icon: TrendingUp, minTvl: 1_000_000_000 },
  { label: '增长最快', icon: Rocket, sortBy: 'change_7d_desc' as SortOption },
]

// 收益率快捷筛选选项
const YIELD_QUICK_FILTERS = [
  { label: '超高收益', icon: Zap, minApy: 100 },
  { label: '高收益', icon: TrendingUp, minApy: 50 },
  { label: '稳定币', icon: Shield, stablecoin: true },
  { label: '低风险', icon: Shield, lowRisk: true },
]

// 排序选项
const SORT_OPTIONS = [
  { value: 'tvl_desc', label: 'TVL 从高到低' },
  { value: 'tvl_asc', label: 'TVL 从低到高' },
  { value: 'change_1d_desc', label: '24h 涨幅最大' },
  { value: 'change_7d_desc', label: '7d 涨幅最大' },
]

export default function DeFiPage() {
  const [activeTab, setActiveTab] = useState<Tab>('protocols')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // 使用防抖搜索
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  // 错误提示状态
  const [error, setError] = useState<string>('')

  // 链数据状态
  const [availableChains, setAvailableChains] = useState<Chain[]>([])
  const [chainsLoading, setChainsLoading] = useState(false)
  const [chainSearchQuery, setChainSearchQuery] = useState('')
  const [showChainSelector, setShowChainSelector] = useState(false)
  const [displayedChainsCount, setDisplayedChainsCount] = useState(20)

  // Protocols 状态
  const [protocols, setProtocols] = useState<Protocol[]>([])
  const [protocolsLoading, setProtocolsLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedChains, setSelectedChains] = useState<string[]>([])
  const [selectedTvlRange, setSelectedTvlRange] = useState(0)
  const [sortBy, setSortBy] = useState<SortOption>('tvl_desc')
  const [protocolsLimit, setProtocolsLimit] = useState(30)
  const [activeProtocolFilter, setActiveProtocolFilter] = useState<number>(-1)

  // Yields 状态
  const [yields, setYields] = useState<YieldPool[]>([])
  const [yieldsLoading, setYieldsLoading] = useState(false)
  const [selectedYieldChain, setSelectedYieldChain] = useState<string>('')
  const [selectedProtocol, setSelectedProtocol] = useState<string>('')
  const [minApy, setMinApy] = useState<number>(0)
  const [yieldsLimit, setYieldsLimit] = useState(30)
  const [activeQuickFilter, setActiveQuickFilter] = useState<number>(-1)

  // Prices 状态
  const [priceChain, setPriceChain] = useState('ethereum')
  const [tokenAddress, setTokenAddress] = useState('')
  const [priceResult, setPriceResult] = useState<{prices: Record<string, TokenPrice>} | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)
  const [copiedPrice, setCopiedPrice] = useState(false)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [nextRefreshIn, setNextRefreshIn] = useState(0)
  const [previousPrice, setPreviousPrice] = useState<number | null>(null)
  const [priceChange, setPriceChange] = useState<'up' | 'down' | null>(null)

  // WebSocket 实时价格状态
  const [useRealtime, setUseRealtime] = useState(false) // 是否启用实时更新
  const [realtimePrice, setRealtimePrice] = useState<BinanceTicker | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const wsClientRef = useRef<BinanceWebSocketClient | null>(null)
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(false) // 是否已启用自动更新

  // 显示错误提示并自动消失
  const showError = (message: string) => {
    setError(message)
    setTimeout(() => setError(''), 3000)
  }


  // 获取所有可用的链
  const fetchChains = useCallback(async () => {
    try {
      setChainsLoading(true)
      const response = await fetch('/api/defi/chains')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '获取链列表失败')
      }

      setAvailableChains(data.chains || [])
    } catch (error) {
      console.error('获取链列表失败:', error)
      // 不显示错误提示，使用空数组作为默认值
      setAvailableChains([])
    } finally {
      setChainsLoading(false)
    }
  }, [])

  // 获取协议列表
  const fetchProtocols = useCallback(async () => {
    try {
      setProtocolsLoading(true)
      setError('')

      // 获取足够多的数据以便客户端筛选和排序
      const fetchLimit = Math.max(protocolsLimit * 2, 200)

      const params = new URLSearchParams()
      if (debouncedSearchQuery) params.append('search', debouncedSearchQuery)
      if (selectedCategory) params.append('category', selectedCategory)
      // 使用第一个选中的链（API 暂时只支持单链）
      if (selectedChains.length > 0) params.append('chain', selectedChains[0])
      params.append('limit', fetchLimit.toString())

      const response = await fetch(`/api/defi/protocols?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '获取协议列表失败')
      }

      let filteredProtocols = data.protocols || []

      // 客户端 TVL 筛选
      const tvlRange = TVL_RANGES[selectedTvlRange]
      if (tvlRange.min > 0) {
        filteredProtocols = filteredProtocols.filter((p: Protocol) =>
          p.tvl >= tvlRange.min && p.tvl < tvlRange.max
        )
      }

      // 客户端排序
      filteredProtocols.sort((a: Protocol, b: Protocol) => {
        switch (sortBy) {
          case 'tvl_desc':
            return (b.tvl || 0) - (a.tvl || 0)
          case 'tvl_asc':
            return (a.tvl || 0) - (b.tvl || 0)
          case 'change_1d_desc':
            return (b.change_1d || 0) - (a.change_1d || 0)
          case 'change_7d_desc':
            return (b.change_7d || 0) - (a.change_7d || 0)
          default:
            return 0
        }
      })

      // 限制显示数量
      filteredProtocols = filteredProtocols.slice(0, protocolsLimit)

      setProtocols(filteredProtocols)
    } catch (error) {
      console.error('获取协议列表失败:', error)
      showError(error instanceof Error ? error.message : '获取协议列表失败')
    } finally {
      setProtocolsLoading(false)
    }
  }, [debouncedSearchQuery, selectedCategory, selectedChains, selectedTvlRange, sortBy, protocolsLimit])

  // 获取收益率列表
  const fetchYields = useCallback(async () => {
    try {
      setYieldsLoading(true)
      setError('')

      const params = new URLSearchParams()
      if (selectedYieldChain) params.append('chain', selectedYieldChain)
      if (selectedProtocol) params.append('protocol', selectedProtocol)
      if (minApy > 0) params.append('minApy', minApy.toString())
      params.append('limit', yieldsLimit.toString())

      const response = await fetch(`/api/defi/yields?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '获取收益率列表失败')
      }

      setYields(data.pools || [])
    } catch (error) {
      console.error('获取收益率列表失败:', error)
      showError(error instanceof Error ? error.message : '获取收益率列表失败')
    } finally {
      setYieldsLoading(false)
    }
  }, [selectedYieldChain, selectedProtocol, minApy, yieldsLimit])

  // 查询代币价格
  const fetchTokenPrice = useCallback(async (silent = false) => {
    if (!tokenAddress.trim()) {
      if (!silent) showError('请输入代币地址')
      return
    }

    try {
      if (!silent) {
        setPriceLoading(true)
        setPriceResult(null)
        setError('')
      }

      const response = await fetch('/api/defi/prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokens: [
            {
              chain: priceChain,
              address: tokenAddress.trim(),
            },
          ],
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '查询价格失败')
      }

      // 检测价格变化
      if (data.prices && Object.keys(data.prices).length > 0) {
        const firstPrice = Object.values(data.prices)[0] as TokenPrice
        const newPrice = firstPrice.price

        if (previousPrice !== null && newPrice !== previousPrice) {
          setPriceChange(newPrice > previousPrice ? 'up' : 'down')
          setTimeout(() => setPriceChange(null), 2000) // 2秒后清除动画
        }
        setPreviousPrice(newPrice)
      }

      setPriceResult(data)

      // 首次查询成功后，自动启动价格更新
      if (!silent && !autoUpdateEnabled && data.prices && Object.keys(data.prices).length > 0) {
        startAutoUpdate(data)
      }
    } catch (error) {
      console.error('查询价格失败:', error)
      if (!silent) {
        showError(error instanceof Error ? error.message : '查询价格失败')
      }
    } finally {
      if (!silent) {
        setPriceLoading(false)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceChain, tokenAddress, autoUpdateEnabled, previousPrice])

  // 停止实时价格更新
  const stopRealtimeUpdates = useCallback(() => {
    if (wsClientRef.current) {
      console.log('[Real-time] 停止实时更新')
      wsClientRef.current.disconnect()
      wsClientRef.current = null
    }
    setWsConnected(false)
    setRealtimePrice(null)
  }, [])

  // 启动实时价格更新（Binance WebSocket）
  const startRealtimeUpdates = useCallback((symbol: string) => {
    // 检查浏览器环境
    if (typeof window === 'undefined') {
      console.error('[Real-time] 非浏览器环境，无法启动 WebSocket')
      return
    }

    // 停止旧连接
    stopRealtimeUpdates()

    console.log('[Real-time] 启动实时更新:', symbol)

    // 获取 Binance 交易对
    const binanceSymbol = getSymbolForToken(symbol)

    try {
      // 创建 WebSocket 客户端
      const wsClient = new BinanceWebSocketClient(binanceSymbol)
      wsClientRef.current = wsClient

      // 订阅价格更新
      wsClient.subscribe((ticker: BinanceTicker) => {
        console.log('[Real-time] 收到价格更新:', ticker.price)

        // 检测价格变化
        setRealtimePrice((prev) => {
          if (prev && parseFloat(prev.price) !== parseFloat(ticker.price)) {
            const direction = parseFloat(ticker.price) > parseFloat(prev.price) ? 'up' : 'down'
            setPriceChange(direction)
            setTimeout(() => setPriceChange(null), 1000) // 1秒后清除动画
          }
          return ticker
        })
      })

      // 连接
      wsClient.connect()

      // 监听连接状态
      const checkConnection = setInterval(() => {
        if (wsClient.isConnected()) {
          setWsConnected(true)
          clearInterval(checkConnection)
          console.log('[Real-time] ✅ WebSocket 连接成功')
        }
      }, 500)

      // 10秒后超时
      setTimeout(() => {
        clearInterval(checkConnection)
        if (!wsClient.isConnected()) {
          console.error('[Real-time] ❌ 连接超时')
          setWsConnected(false)
          setUseRealtime(false) // 自动关闭实时模式
          showError('WebSocket 连接超时。可能原因：\n1. 网络连接问题\n2. Binance 服务暂时不可用\n3. 浏览器安全设置阻止了 WebSocket')
        }
      }, 10000)
    } catch (error) {
      console.error('[Real-time] 启动失败:', error)
      setWsConnected(false)
      setUseRealtime(false)
      showError('实时更新启动失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  // stopRealtimeUpdates is intentionally excluded from deps as it's a stable ref
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showError])

  // 启动定时刷新
  const startPollingUpdate = useCallback(() => {
    setAutoRefresh(true)
    setAutoUpdateEnabled(true)
    setNextRefreshIn(10) // 10秒刷新一次
    console.log('[自动更新] 定时刷新已启动（10秒间隔）')
  }, [])

  // 启动自动价格更新（根据地区选择方式）
  const startAutoUpdate = useCallback(async (priceData: {prices: Record<string, TokenPrice>}) => {
    console.log('[自动更新] 准备启动自动价格更新...')

    // 获取代币符号
    const firstPrice = Object.values(priceData.prices)[0] as TokenPrice
    const symbol = firstPrice.symbol || 'BTC'
    const normalizedSymbol = symbol.toUpperCase()

    // 尝试使用 WebSocket 实时更新（移除地区限制）
    console.log('[自动更新] 🚀 尝试启动 WebSocket 实时更新（无地区限制）')

    // 检查是否支持实时更新
    if (COMMON_SYMBOLS[normalizedSymbol]) {
      console.log(`[自动更新] ✅ ${symbol} 支持 WebSocket，启动实时更新`)
      setUseRealtime(true)
      setAutoUpdateEnabled(true)
      startRealtimeUpdates(normalizedSymbol)
    } else {
      console.log(`[自动更新] ⚠️ ${symbol} 不支持 WebSocket，使用定时刷新`)
      console.log(`[自动更新] 支持的代币: ${Object.keys(COMMON_SYMBOLS).join(', ')}`)
      startPollingUpdate()
    }
  // startRealtimeUpdates and startPollingUpdate are stable callbacks
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 页面加载时获取链列表
  useEffect(() => {
    fetchChains()
  }, [fetchChains])

  // 当链列表加载完成后，确保价格查询链在列表中
  useEffect(() => {
    if (availableChains.length > 0) {
      // 检查当前选中的链是否在列表中
      const currentChainExists = availableChains.some(chain =>
        chain.name.toLowerCase() === priceChain
      )

      // 如果当前链不在列表中，选择 Ethereum 或第一个链
      if (!currentChainExists) {
        const ethereumChain = availableChains.find(chain =>
          chain.name.toLowerCase() === 'ethereum'
        )
        setPriceChain((ethereumChain?.name || availableChains[0].name).toLowerCase())
      }
    }
  }, [availableChains, priceChain])

  // 每秒更新当前时间，用于实时显示相对时间
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // 自动刷新价格（定时模式，10秒间隔）
  useEffect(() => {
    if (!autoRefresh || !priceResult || useRealtime) return

    const interval = 10 // 固定10秒

    // 初始化倒计时
    setNextRefreshIn(interval)

    // 倒计时定时器
    const countdownInterval = setInterval(() => {
      setNextRefreshIn(prev => {
        if (prev <= 1) {
          return interval
        }
        return prev - 1
      })
    }, 1000)

    // 刷新定时器
    const refreshTimer = setInterval(() => {
      fetchTokenPrice(true) // 静默刷新
    }, interval * 1000)

    return () => {
      clearInterval(countdownInterval)
      clearInterval(refreshTimer)
    }
  }, [autoRefresh, priceResult, useRealtime, fetchTokenPrice])

  // Tab 切换时加载数据
  useEffect(() => {
    if (activeTab === 'protocols') {
      fetchProtocols()
    } else if (activeTab === 'yields') {
      fetchYields()
    }

    // 离开价格查询 tab 时断开 WebSocket
    if (activeTab !== 'prices') {
      stopRealtimeUpdates()
    }
  }, [activeTab, fetchProtocols, fetchYields, stopRealtimeUpdates])

  // 组件卸载时清理 WebSocket 和定时器
  useEffect(() => {
    return () => {
      stopRealtimeUpdates()
      setAutoRefresh(false)
      setAutoUpdateEnabled(false)
    }
  }, [stopRealtimeUpdates])

  // 清除所有过滤器
  const clearAllFilters = () => {
    setSearchQuery('')
    setSelectedCategory('')
    setSelectedChains([])
    setSelectedTvlRange(0)
    setSortBy('tvl_desc')
    setActiveProtocolFilter(-1)
    setSelectedYieldChain('')
    setSelectedProtocol('')
    setMinApy(0)
    setActiveQuickFilter(-1)
    setProtocolsLimit(30)
    setYieldsLimit(30)
    setChainSearchQuery('')
  }

  // 检查是否有激活的过滤器
  const hasActiveFilters = () => {
    if (activeTab === 'protocols') {
      return !!(searchQuery || selectedCategory || selectedChains.length > 0 || selectedTvlRange > 0 || activeProtocolFilter >= 0)
    } else if (activeTab === 'yields') {
      return !!(selectedYieldChain || selectedProtocol || minApy > 0 || activeQuickFilter >= 0)
    }
    return false
  }

  // 切换链选择
  const toggleChain = (chain: string) => {
    setSelectedChains((prev) =>
      prev.includes(chain) ? prev.filter((c) => c !== chain) : [...prev, chain]
    )
  }

  // 移除链标签
  const removeChain = (chain: string) => {
    setSelectedChains((prev) => prev.filter((c) => c !== chain))
  }

  // 应用协议快捷筛选
  const applyProtocolQuickFilter = (index: number) => {
    const filter = PROTOCOL_QUICK_FILTERS[index]
    setActiveProtocolFilter(index)

    if (filter.limit) {
      setProtocolsLimit(filter.limit)
    }
    if (filter.sortBy) {
      setSortBy(filter.sortBy)
    }
    if (filter.minTvl) {
      const rangeIndex = TVL_RANGES.findIndex(r => r.min === filter.minTvl)
      if (rangeIndex >= 0) {
        setSelectedTvlRange(rangeIndex)
      }
    }
  }

  // 应用收益率快捷筛选
  const applyYieldQuickFilter = (index: number) => {
    const filter = YIELD_QUICK_FILTERS[index]
    setActiveQuickFilter(index)

    if (filter.minApy) {
      setMinApy(filter.minApy)
      setSelectedYieldChain('')
      setSelectedProtocol('')
    }
    // 其他筛选逻辑可以根据需要扩展
  }

  // 加载更多收益率
  const loadMoreYields = () => {
    setYieldsLimit((prev) => prev + 20)
  }

  // 快捷填充示例地址
  const fillExampleAddress = (address: string, chain: string) => {
    setTokenAddress(address)
    setPriceChain(chain.toLowerCase())
  }

  // 复制价格
  const copyPrice = (price: string) => {
    navigator.clipboard.writeText(price)
    setCopiedPrice(true)
    setTimeout(() => setCopiedPrice(false), 2000)
  }

  // 过滤链列表（基于搜索）
  const filteredChains = availableChains.filter(chain =>
    chain.name.toLowerCase().includes(chainSearchQuery.toLowerCase())
  )

  // 获取显示的链列表
  const displayedChains = filteredChains.slice(0, displayedChainsCount)

  // 加载更多链
  const loadMoreChains = () => {
    setDisplayedChainsCount(prev => prev + 20)
  }

  // 获取热门链（用于快速选择）
  const topChains = availableChains.slice(0, 10)

  // 格式化相对时间（实时更新）
  const formatRelativeTime = (timestamp: number) => {
    const seconds = Math.floor((currentTime - timestamp * 1000) / 1000)

    if (seconds < 5) return '刚刚'
    if (seconds < 60) return `${seconds}秒前`

    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}分钟前`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}小时前`

    const days = Math.floor(hours / 24)
    return `${days}天前`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 页面标题 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-6 h-6 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-900">DeFi 数据浏览器</h1>
          </div>
          <p className="text-gray-600 text-sm">
            浏览 DeFi 协议、收益率池子和代币价格
          </p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">错误</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError('')}
              className="text-red-500 hover:text-red-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Tab 导航 */}
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-2 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => setActiveTab('protocols')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'protocols'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              协议
            </button>
            <button
              onClick={() => setActiveTab('yields')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'yields'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              收益率
            </button>
            <button
              onClick={() => setActiveTab('prices')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'prices'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              价格查询
            </button>
          </div>
        </div>

        {/* Protocols Tab */}
        {activeTab === 'protocols' && (
          <>
            {/* 快捷筛选按钮 */}
            <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
              {PROTOCOL_QUICK_FILTERS.map((filter, index) => {
                const Icon = filter.icon
                return (
                  <button
                    key={index}
                    onClick={() => applyProtocolQuickFilter(index)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                      activeProtocolFilter === index
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {filter.label}
                  </button>
                )
              })}
            </div>

            {/* 搜索和过滤栏 */}
            <div className="mb-6 space-y-3">
              {/* 搜索框 */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索协议名称...（实时搜索）"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                    showFilters || hasActiveFilters()
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  过滤
                </button>
              </div>

              {/* 活跃筛选标签 */}
              {hasActiveFilters() && (
                <div className="flex flex-wrap gap-2 items-center animate-fade-in">
                  <span className="text-sm text-gray-500 font-medium">活跃筛选:</span>
                  {searchQuery && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm">
                      <Search className="w-3.5 h-3.5" />
                      <span>&quot;{searchQuery}&quot;</span>
                      <button
                        onClick={() => setSearchQuery('')}
                        className="hover:bg-blue-200 rounded-full p-0.5 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {selectedCategory && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm">
                      <span>{selectedCategory}</span>
                      <button
                        onClick={() => setSelectedCategory('')}
                        className="hover:bg-purple-200 rounded-full p-0.5 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {selectedChains.map((chain) => (
                    <div
                      key={chain}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm"
                    >
                      <span>{chain}</span>
                      <button
                        onClick={() => removeChain(chain)}
                        className="hover:bg-green-200 rounded-full p-0.5 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {selectedTvlRange > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>{TVL_RANGES[selectedTvlRange].label}</span>
                      <button
                        onClick={() => setSelectedTvlRange(0)}
                        className="hover:bg-orange-200 rounded-full p-0.5 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <button
                    onClick={clearAllFilters}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition font-medium"
                  >
                    清除所有
                  </button>
                </div>
              )}

              {/* 过滤器面板 */}
              {showFilters && (
                <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">高级筛选</h3>
                    {hasActiveFilters() && (
                      <button
                        onClick={clearAllFilters}
                        className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        清除所有
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 分类过滤 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        分类
                      </label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">全部分类</option>
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* TVL 范围过滤 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        TVL 范围
                      </label>
                      <select
                        value={selectedTvlRange}
                        onChange={(e) => setSelectedTvlRange(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {TVL_RANGES.map((range, index) => (
                          <option key={index} value={index}>
                            {range.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 排序方式 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                        <ArrowUpDown className="w-4 h-4" />
                        排序方式
                      </label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {SORT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 链过滤（多选） */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        区块链（多选）
                      </label>
                      <button
                        onClick={() => setShowChainSelector(!showChainSelector)}
                        className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                      >
                        {showChainSelector ? (
                          <>
                            <ChevronUp className="w-3 h-3" />
                            收起
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3" />
                            展开全部 ({availableChains.length} 条链)
                          </>
                        )}
                      </button>
                    </div>

                    {/* 热门链快速选择 */}
                    {!showChainSelector && (
                      <div className="flex flex-wrap gap-2">
                        {topChains.map((chain) => (
                          <button
                            key={chain.name}
                            onClick={() => toggleChain(chain.name)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              selectedChains.includes(chain.name)
                                ? 'bg-blue-500 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {chain.name}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* 完整链选择器 */}
                    {showChainSelector && (
                      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        {/* 搜索框 */}
                        <div className="relative mb-3">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={chainSearchQuery}
                            onChange={(e) => {
                              setChainSearchQuery(e.target.value)
                              setDisplayedChainsCount(20) // 重置显示数量
                            }}
                            placeholder="搜索链名称..."
                            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {/* 链列表 */}
                        <div className="max-h-64 overflow-y-auto space-y-1.5">
                          {chainsLoading ? (
                            <div className="text-center py-4 text-sm text-gray-500">
                              加载中...
                            </div>
                          ) : displayedChains.length === 0 ? (
                            <div className="text-center py-4 text-sm text-gray-500">
                              未找到匹配的链
                            </div>
                          ) : (
                            <>
                              {displayedChains.map((chain) => (
                                <button
                                  key={chain.name}
                                  onClick={() => toggleChain(chain.name)}
                                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between ${
                                    selectedChains.includes(chain.name)
                                      ? 'bg-blue-500 text-white shadow-sm'
                                      : 'bg-white text-gray-700 hover:bg-gray-100'
                                  }`}
                                >
                                  <span className="font-medium">{chain.name}</span>
                                  <span className={`text-xs ${
                                    selectedChains.includes(chain.name)
                                      ? 'text-blue-100'
                                      : 'text-gray-500'
                                  }`}>
                                    {formatTVL(chain.tvl)}
                                  </span>
                                </button>
                              ))}

                              {/* 加载更多按钮 */}
                              {displayedChains.length < filteredChains.length && (
                                <button
                                  onClick={loadMoreChains}
                                  className="w-full py-2 text-xs text-blue-500 hover:text-blue-600 font-medium"
                                >
                                  加载更多 ({filteredChains.length - displayedChains.length} 条)
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 协议列表标题和排序 */}
            {!protocolsLoading && protocols.length > 0 && (
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {debouncedSearchQuery ? '搜索结果' : '热门协议推荐'}
                  </h2>
                  <span className="text-sm text-gray-500">
                    ({protocols.length} 个协议)
                  </span>
                </div>

                {/* TVL 排序切换按钮 */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 hidden sm:inline">按 TVL:</span>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setSortBy('tvl_desc')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        sortBy === 'tvl_desc'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <ArrowUpDown className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">高到低</span>
                      <span className="sm:hidden">↓</span>
                    </button>
                    <button
                      onClick={() => setSortBy('tvl_asc')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        sortBy === 'tvl_asc'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <ArrowUpDown className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">低到高</span>
                      <span className="sm:hidden">↑</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 协议列表 */}
            {protocolsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 animate-pulse"
                  >
                    <div className="flex items-start space-x-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gray-200"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-8 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : protocols.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  未找到协议
                </h3>
                <p className="text-gray-500 mb-6">
                  尝试调整搜索条件或过滤器
                </p>
                {hasActiveFilters() && (
                  <button
                    onClick={clearAllFilters}
                    className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition"
                  >
                    清除过滤器
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {protocols.map((protocol) => (
                    <ProtocolCard key={protocol.id} protocol={protocol} />
                  ))}
                </div>

                {/* 加载更多按钮 */}
                {protocols.length >= protocolsLimit && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={() => setProtocolsLimit((prev) => prev + 20)}
                      className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-full hover:bg-gray-50 hover:border-gray-300 transition font-medium"
                    >
                      加载更多
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Yields Tab */}
        {activeTab === 'yields' && (
          <>
            {/* 快捷筛选按钮 */}
            <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
              {YIELD_QUICK_FILTERS.map((filter, index) => {
                const Icon = filter.icon
                return (
                  <button
                    key={index}
                    onClick={() => applyYieldQuickFilter(index)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                      activeQuickFilter === index
                        ? 'bg-green-500 text-white shadow-md'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-green-300 hover:text-green-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {filter.label}
                  </button>
                )
              })}
            </div>

            {/* 过滤栏 */}
            <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">过滤条件</h3>
                {hasActiveFilters() && (
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    清除所有
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 链过滤 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    区块链
                  </label>
                  <select
                    value={selectedYieldChain}
                    onChange={(e) => setSelectedYieldChain(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">全部链</option>
                    {availableChains.map((chain) => (
                      <option key={chain.name} value={chain.name}>
                        {chain.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 协议过滤 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    协议名称
                  </label>
                  <input
                    type="text"
                    value={selectedProtocol}
                    onChange={(e) => setSelectedProtocol(e.target.value)}
                    placeholder="例如: aave, uniswap"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 最低 APY */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    最低 APY (%)
                  </label>
                  <input
                    type="number"
                    value={minApy}
                    onChange={(e) => setMinApy(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="1"
                    placeholder="0"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 收益率列表 */}
            {yieldsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 animate-pulse"
                  >
                    <div className="space-y-4">
                      <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-12 bg-gray-200 rounded"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : yields.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  未找到收益率池子
                </h3>
                <p className="text-gray-500 mb-6">
                  尝试调整过滤条件
                </p>
                {hasActiveFilters() && (
                  <button
                    onClick={clearAllFilters}
                    className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition"
                  >
                    清除过滤器
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {yields.map((pool) => (
                    <YieldCard key={pool.pool} pool={pool} />
                  ))}
                </div>

                {/* 加载更多按钮 */}
                {yields.length >= yieldsLimit && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={loadMoreYields}
                      className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-full hover:bg-gray-50 hover:border-gray-300 transition font-medium"
                    >
                      加载更多
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Prices Tab */}
        {activeTab === 'prices' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">代币价格查询</h2>
              <p className="text-sm text-gray-600 mb-6">
                输入代币合约地址查询实时价格
              </p>

              <div className="space-y-4">
                {/* 链选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    区块链
                  </label>
                  <select
                    value={priceChain}
                    onChange={(e) => setPriceChain(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableChains.length > 0 ? (
                      availableChains.map((chain) => (
                        <option key={chain.name} value={chain.name.toLowerCase()}>
                          {chain.name}
                        </option>
                      ))
                    ) : (
                      <option value="ethereum">Ethereum</option>
                    )}
                  </select>
                </div>

                {/* 代币地址 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    代币合约地址
                  </label>
                  <input
                    type="text"
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 自动更新状态提示 */}
                {autoUpdateEnabled && (
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-gray-700">
                          {useRealtime ? (
                            <>
                              <Activity className="w-4 h-4 inline mr-1 text-green-600" />
                              实时价格更新中（毫秒级）
                            </>
                          ) : (
                            '自动刷新中（10秒间隔）'
                          )}
                        </span>
                      </div>

                      {/* 连接状态 */}
                      {useRealtime && (
                        <div className="flex items-center gap-1.5">
                          {wsConnected ? (
                            <>
                              <Wifi className="w-4 h-4 text-green-600" />
                              <span className="text-xs font-medium text-green-700">已连接</span>
                            </>
                          ) : (
                            <>
                              <WifiOff className="w-4 h-4 text-orange-500" />
                              <span className="text-xs font-medium text-orange-600">连接中...</span>
                            </>
                          )}
                        </div>
                      )}

                      {/* 定时刷新倒计时 */}
                      {!useRealtime && autoRefresh && nextRefreshIn > 0 && (
                        <span className="text-xs text-gray-500">
                          下次刷新: {nextRefreshIn}秒
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-600">
                      {useRealtime ? (
                        <>
                          ✨ 使用 Binance WebSocket 获取真正的实时市场价格（毫秒级更新）
                          {!wsConnected && (
                            <span className="block mt-1 text-orange-600">
                              ⚠️ 连接中，请稍候... 如果长时间无法连接，可能是网络限制
                            </span>
                          )}
                        </>
                      ) : (
                        '💡 价格每 10 秒自动更新一次'
                      )}
                    </p>
                  </div>
                )}

                {/* 查询按钮 */}
                <button
                  onClick={() => fetchTokenPrice(false)}
                  disabled={priceLoading || !tokenAddress.trim()}
                  className="w-full px-4 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {priceLoading ? '查询中...' : '查询价格'}
                </button>

                {/* 价格结果 */}
                {priceResult && priceResult.prices && (
                  <div className="mt-6 space-y-4">
                    {/* 实时价格显示（WebSocket） */}
                    {useRealtime && realtimePrice ? (
                      <div className="p-4 bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-300 rounded-lg shadow-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                              <Activity className="w-5 h-5 text-green-600 animate-pulse" />
                              {realtimePrice.symbol}
                              <span className="text-xs font-normal px-2 py-0.5 bg-green-600 text-white rounded-full">
                                实时
                              </span>
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">Binance WebSocket 流式价格</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {/* 实时价格 */}
                          <div className={`flex items-center justify-between p-4 bg-white rounded-lg transition-all ${
                            priceChange === 'up' ? 'ring-2 ring-green-400 bg-green-50' :
                            priceChange === 'down' ? 'ring-2 ring-red-400 bg-red-50' : ''
                          }`}>
                            <span className="text-sm font-medium text-gray-600">实时价格</span>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                {priceChange === 'up' && (
                                  <span className="text-green-600 text-sm animate-bounce">↑</span>
                                )}
                                {priceChange === 'down' && (
                                  <span className="text-red-600 text-sm animate-bounce">↓</span>
                                )}
                                <span className={`text-3xl font-bold transition-colors ${
                                  priceChange === 'up' ? 'text-green-600' :
                                  priceChange === 'down' ? 'text-red-600' :
                                  'text-green-600'
                                }`}>
                                  ${parseFloat(realtimePrice.price).toFixed(2)}
                                </span>
                              </div>
                              <button
                                onClick={() => copyPrice(`$${parseFloat(realtimePrice.price).toFixed(2)}`)}
                                className="p-1.5 hover:bg-gray-100 rounded transition"
                                title="复制价格"
                              >
                                {copiedPrice ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Copy className="w-4 h-4 text-gray-400" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* 24小时变化 */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-white rounded-lg">
                              <p className="text-xs text-gray-500 mb-1">24h 涨跌</p>
                              <p className={`text-lg font-bold ${
                                parseFloat(realtimePrice.priceChangePercent) >= 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}>
                                {parseFloat(realtimePrice.priceChangePercent) >= 0 ? '+' : ''}
                                {parseFloat(realtimePrice.priceChangePercent).toFixed(2)}%
                              </p>
                            </div>
                            <div className="p-3 bg-white rounded-lg">
                              <p className="text-xs text-gray-500 mb-1">24h 交易量</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {parseFloat(realtimePrice.volume).toLocaleString('en-US', {
                                  maximumFractionDigits: 0
                                })}
                              </p>
                            </div>
                          </div>

                          {/* 更新时间 */}
                          <div className="p-3 bg-white rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">最后更新</p>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <p className="text-sm font-semibold text-gray-900">
                                {formatRelativeTime(Math.floor(realtimePrice.timestamp / 1000))}
                              </p>
                              <span className="text-xs text-gray-400">·</span>
                              <p className="text-xs text-gray-500">
                                {new Date(realtimePrice.timestamp).toLocaleTimeString('zh-CN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* DeFiLlama 价格显示 */
                      Object.entries(priceResult.prices).map(([key, value]: [string, TokenPrice]) => (
                        <div key={key} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                <Coins className="w-5 h-5 text-green-600" />
                                {value.symbol}
                              </h3>
                              <p className="text-xs text-gray-500 mt-1 break-all">{key}</p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {/* 价格 */}
                            <div className={`flex items-center justify-between p-3 bg-white rounded-lg transition-all ${
                              priceChange === 'up' ? 'ring-2 ring-green-400 bg-green-50' :
                              priceChange === 'down' ? 'ring-2 ring-red-400 bg-red-50' : ''
                            }`}>
                              <span className="text-sm font-medium text-gray-600">价格</span>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  {priceChange === 'up' && (
                                    <span className="text-green-600 text-sm animate-bounce">↑</span>
                                  )}
                                  {priceChange === 'down' && (
                                    <span className="text-red-600 text-sm animate-bounce">↓</span>
                                  )}
                                  <span className={`text-2xl font-bold transition-colors ${
                                    priceChange === 'up' ? 'text-green-600' :
                                    priceChange === 'down' ? 'text-red-600' :
                                    'text-green-600'
                                  }`}>
                                    {formatTokenPrice(value.price)}
                                  </span>
                                </div>
                                <button
                                  onClick={() => copyPrice(formatTokenPrice(value.price))}
                                  className="p-1.5 hover:bg-gray-100 rounded transition"
                                  title="复制价格"
                                >
                                  {copiedPrice ? (
                                    <Check className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <Copy className="w-4 h-4 text-gray-400" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* 精度和信心度 */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 bg-white rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">精度</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {value.decimals} 位
                                </p>
                              </div>
                              <div className="p-3 bg-white rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">信心度</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {(value.confidence * 100).toFixed(1)}%
                                </p>
                              </div>
                            </div>

                            {/* 时间戳 */}
                            <div className="p-3 bg-white rounded-lg">
                              <p className="text-xs text-gray-500 mb-1">更新时间</p>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900">
                                  {formatRelativeTime(value.timestamp)}
                                </p>
                                <span className="text-xs text-gray-400">·</span>
                                <p className="text-xs text-gray-500">
                                  {formatTimestamp(value.timestamp)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* 示例地址 */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  示例地址（点击填充）
                  <span className="ml-2 text-xs font-normal text-green-600">✨ 支持实时更新</span>
                </h4>
                <div className="space-y-2">
                  <button
                    onClick={() => fillExampleAddress('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 'ethereum')}
                    className="w-full text-left p-2 hover:bg-gray-100 rounded transition border border-transparent hover:border-green-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-gray-700">WETH (Ethereum)</div>
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">实时</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2</div>
                  </button>
                  <button
                    onClick={() => fillExampleAddress('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum')}
                    className="w-full text-left p-2 hover:bg-gray-100 rounded transition border border-transparent hover:border-green-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-gray-700">USDC (Ethereum)</div>
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">实时</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
