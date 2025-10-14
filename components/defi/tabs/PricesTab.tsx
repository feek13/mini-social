'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Activity, Wifi, WifiOff, Copy, Check, Coins } from 'lucide-react'
import { Chain, TokenPrice } from '@/lib/defillama/types'
import { formatTokenPrice, formatTimestamp } from '@/lib/utils'
import { BinanceWebSocketClient, getSymbolForToken, BinanceTicker, COMMON_SYMBOLS } from '@/lib/binance-websocket'

interface PricesTabProps {
  availableChains: Chain[]
  onError: (message: string) => void
}

export default function PricesTab({ availableChains, onError }: PricesTabProps) {
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

  // WebSocket real-time price state
  const [useRealtime, setUseRealtime] = useState(false)
  const [realtimePrice, setRealtimePrice] = useState<BinanceTicker | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const wsClientRef = useRef<BinanceWebSocketClient | null>(null)
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(false)

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Auto-refresh countdown
  useEffect(() => {
    if (!autoRefresh || !priceResult || useRealtime) return

    const interval = 10
    setNextRefreshIn(interval)

    const countdownInterval = setInterval(() => {
      setNextRefreshIn(prev => (prev <= 1 ? interval : prev - 1))
    }, 1000)

    const refreshTimer = setInterval(() => {
      fetchTokenPrice(true) // Silent refresh
    }, interval * 1000)

    return () => {
      clearInterval(countdownInterval)
      clearInterval(refreshTimer)
    }
  }, [autoRefresh, priceResult, useRealtime])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRealtimeUpdates()
      setAutoRefresh(false)
      setAutoUpdateEnabled(false)
    }
  }, [])

  // Ensure price chain is valid
  useEffect(() => {
    if (availableChains.length > 0) {
      const currentChainExists = availableChains.some(chain =>
        chain.name.toLowerCase() === priceChain
      )
      if (!currentChainExists) {
        const ethereumChain = availableChains.find(chain =>
          chain.name.toLowerCase() === 'ethereum'
        )
        setPriceChain((ethereumChain?.name || availableChains[0].name).toLowerCase())
      }
    }
  }, [availableChains, priceChain])

  // Stop real-time updates
  const stopRealtimeUpdates = useCallback(() => {
    if (wsClientRef.current) {
      console.log('[Real-time] 停止实时更新')
      wsClientRef.current.disconnect()
      wsClientRef.current = null
    }
    setWsConnected(false)
    setRealtimePrice(null)
  }, [])

  // Start real-time updates (Binance WebSocket)
  const startRealtimeUpdates = useCallback((symbol: string) => {
    if (typeof window === 'undefined') {
      console.error('[Real-time] 非浏览器环境，无法启动 WebSocket')
      return
    }

    stopRealtimeUpdates()
    console.log('[Real-time] 启动实时更新:', symbol)

    const binanceSymbol = getSymbolForToken(symbol)

    try {
      const wsClient = new BinanceWebSocketClient(binanceSymbol)
      wsClientRef.current = wsClient

      wsClient.subscribe((ticker: BinanceTicker) => {
        console.log('[Real-time] 收到价格更新:', ticker.price)
        setRealtimePrice((prev) => {
          if (prev && parseFloat(prev.price) !== parseFloat(ticker.price)) {
            const direction = parseFloat(ticker.price) > parseFloat(prev.price) ? 'up' : 'down'
            setPriceChange(direction)
            setTimeout(() => setPriceChange(null), 1000)
          }
          return ticker
        })
      })

      wsClient.connect()

      const checkConnection = setInterval(() => {
        if (wsClient.isConnected()) {
          setWsConnected(true)
          clearInterval(checkConnection)
          console.log('[Real-time] ✅ WebSocket 连接成功')
        }
      }, 500)

      setTimeout(() => {
        clearInterval(checkConnection)
        if (!wsClient.isConnected()) {
          console.error('[Real-time] ❌ 连接超时')
          setWsConnected(false)
          setUseRealtime(false)
          onError('WebSocket 连接超时。可能原因：\n1. 网络连接问题\n2. Binance 服务暂时不可用\n3. 浏览器安全设置阻止了 WebSocket')
        }
      }, 10000)
    } catch (error) {
      console.error('[Real-time] 启动失败:', error)
      setWsConnected(false)
      setUseRealtime(false)
      onError('实时更新启动失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }, [stopRealtimeUpdates, onError])

  // Start polling update
  const startPollingUpdate = useCallback(() => {
    setAutoRefresh(true)
    setAutoUpdateEnabled(true)
    setNextRefreshIn(10)
    console.log('[自动更新] 定时刷新已启动（10秒间隔）')
  }, [])

  // Start auto update
  const startAutoUpdate = useCallback(async (priceData: {prices: Record<string, TokenPrice>}) => {
    console.log('[自动更新] 准备启动自动价格更新...')

    const firstPrice = Object.values(priceData.prices)[0] as TokenPrice
    const symbol = firstPrice.symbol || 'BTC'
    const normalizedSymbol = symbol.toUpperCase()

    console.log('[自动更新] 🚀 尝试启动 WebSocket 实时更新（无地区限制）')

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
  }, [startRealtimeUpdates, startPollingUpdate])

  // Fetch token price
  const fetchTokenPrice = useCallback(async (silent = false) => {
    if (!tokenAddress.trim()) {
      if (!silent) onError('请输入代币地址')
      return
    }

    try {
      if (!silent) {
        setPriceLoading(true)
        setPriceResult(null)
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

      // Detect price change
      if (data.prices && Object.keys(data.prices).length > 0) {
        const firstPrice = Object.values(data.prices)[0] as TokenPrice
        const newPrice = firstPrice.price

        if (previousPrice !== null && newPrice !== previousPrice) {
          setPriceChange(newPrice > previousPrice ? 'up' : 'down')
          setTimeout(() => setPriceChange(null), 2000)
        }
        setPreviousPrice(newPrice)
      }

      setPriceResult(data)

      // Auto-start updates on first success
      if (!silent && !autoUpdateEnabled && data.prices && Object.keys(data.prices).length > 0) {
        startAutoUpdate(data)
      }
    } catch (error) {
      console.error('查询价格失败:', error)
      if (!silent) {
        onError(error instanceof Error ? error.message : '查询价格失败')
      }
    } finally {
      if (!silent) {
        setPriceLoading(false)
      }
    }
  }, [priceChain, tokenAddress, autoUpdateEnabled, previousPrice, onError, startAutoUpdate])

  // Quick fill example address
  const fillExampleAddress = (address: string, chain: string) => {
    setTokenAddress(address)
    setPriceChain(chain.toLowerCase())
  }

  // Copy price
  const copyPrice = (price: string) => {
    navigator.clipboard.writeText(price)
    setCopiedPrice(true)
    setTimeout(() => setCopiedPrice(false), 2000)
  }

  // Format relative time
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
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">代币价格查询</h2>
        <p className="text-sm text-gray-600 mb-6">
          输入代币合约地址查询实时价格
        </p>

        <div className="space-y-4">
          {/* Chain Selection */}
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

          {/* Token Address */}
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

          {/* Auto-update Status */}
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

                {/* Connection Status */}
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

                {/* Countdown */}
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

          {/* Query Button */}
          <button
            onClick={() => fetchTokenPrice(false)}
            disabled={priceLoading || !tokenAddress.trim()}
            className="w-full px-4 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {priceLoading ? '查询中...' : '查询价格'}
          </button>

          {/* Price Result */}
          {priceResult && priceResult.prices && (
            <div className="mt-6 space-y-4">
              {/* Real-time Price (WebSocket) */}
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
                    {/* Real-time Price */}
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

                    {/* 24h Change */}
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

                    {/* Last Update */}
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
                /* DeFiLlama Price */
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
                      {/* Price */}
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

                      {/* Decimals & Confidence */}
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

                      {/* Timestamp */}
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

        {/* Example Addresses */}
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
  )
}
