/**
 * Binance WebSocket 实时价格客户端
 *
 * 提供真正的秒级（甚至毫秒级）实时价格更新
 * 文档: https://binance-docs.github.io/apidocs/spot/en/#websocket-market-streams
 */

export interface BinanceTicker {
  symbol: string        // 交易对符号，如 BTCUSDT
  price: string         // 最新价格
  priceChangePercent: string // 24小时价格变化百分比
  volume: string        // 24小时交易量
  timestamp: number     // 时间戳
}

export type PriceUpdateCallback = (ticker: BinanceTicker) => void

/**
 * Binance WebSocket 客户端类
 */
export class BinanceWebSocketClient {
  private ws: WebSocket | null = null
  private callbacks: Set<PriceUpdateCallback> = new Set()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000
  private symbol: string
  private isConnecting = false

  constructor(symbol: string = 'btcusdt') {
    this.symbol = symbol.toLowerCase()
  }

  /**
   * 连接到 Binance WebSocket
   */
  connect(): void {
    // 检查是否在浏览器环境
    if (typeof window === 'undefined') {
      console.error('[Binance WS] Cannot connect: Not in browser environment')
      return
    }

    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      console.log('[Binance WS] Already connected or connecting')
      return
    }

    try {
      this.isConnecting = true
      // Binance WebSocket 端点
      // 使用 24hr ticker 流，包含价格和统计信息
      const wsUrl = `wss://stream.binance.com:9443/ws/${this.symbol}@ticker`

      console.log(`[Binance WS] Connecting to ${wsUrl}`)
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log(`[Binance WS] Connected to ${this.symbol.toUpperCase()}`)
        this.reconnectAttempts = 0
        this.isConnecting = false
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          // Binance ticker 数据格式
          const ticker: BinanceTicker = {
            symbol: data.s,
            price: data.c,  // c = current price
            priceChangePercent: data.P,  // P = price change percent
            volume: data.v,  // v = volume
            timestamp: data.E  // E = event time
          }

          // 通知所有回调
          this.callbacks.forEach(callback => {
            try {
              callback(ticker)
            } catch (error) {
              console.error('[Binance WS] Callback error:', error)
            }
          })
        } catch (error) {
          console.error('[Binance WS] Parse error:', error)
        }
      }

      this.ws.onerror = (error) => {
        console.error('[Binance WS] Connection error. This might be due to:')
        console.error('1. CORS policy blocking WebSocket connection')
        console.error('2. Network connectivity issues')
        console.error('3. Invalid trading pair symbol')
        console.error('Error details:', error)
        this.isConnecting = false
      }

      this.ws.onclose = (event) => {
        console.log('[Binance WS] Connection closed', {
          code: event.code,
          reason: event.reason || 'No reason provided',
          wasClean: event.wasClean
        })
        this.isConnecting = false
        this.ws = null

        // 自动重连（仅在非正常关闭时）
        if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++
          console.log(`[Binance WS] Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
          setTimeout(() => this.connect(), this.reconnectDelay)
        } else if (event.wasClean) {
          console.log('[Binance WS] Connection closed normally, no reconnection needed')
        } else {
          console.error('[Binance WS] Max reconnect attempts reached')
        }
      }
    } catch (error) {
      console.error('[Binance WS] Connect error:', error)
      this.isConnecting = false
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.ws) {
      console.log('[Binance WS] Disconnecting...')
      this.reconnectAttempts = this.maxReconnectAttempts // 阻止自动重连
      this.ws.close()
      this.ws = null
    }
  }

  /**
   * 订阅价格更新
   */
  subscribe(callback: PriceUpdateCallback): () => void {
    this.callbacks.add(callback)

    // 返回取消订阅函数
    return () => {
      this.callbacks.delete(callback)
    }
  }

  /**
   * 切换交易对
   */
  changeSymbol(newSymbol: string): void {
    this.disconnect()
    this.symbol = newSymbol.toLowerCase()
    this.reconnectAttempts = 0
    setTimeout(() => this.connect(), 100)
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

/**
 * 常用交易对映射
 */
export const COMMON_SYMBOLS: Record<string, string> = {
  // 主流币
  'WETH': 'ethusdt',
  'ETH': 'ethusdt',
  'BTC': 'btcusdt',
  'WBTC': 'btcusdt',

  // 稳定币
  'USDT': 'usdtusdt',
  'USDC': 'usdcusdt',
  'DAI': 'daiusdt',
  'BUSD': 'busdusdt',

  // 热门代币
  'BNB': 'bnbusdt',
  'SOL': 'solusdt',
  'ADA': 'adausdt',
  'AVAX': 'avaxusdt',
  'DOT': 'dotusdt',
  'MATIC': 'maticusdt',
  'LINK': 'linkusdt',
  'UNI': 'uniusdt',
  'AAVE': 'aaveusdt',
}

/**
 * 根据代币符号获取 Binance 交易对
 */
export function getSymbolForToken(tokenSymbol: string): string {
  const normalized = tokenSymbol.toUpperCase()
  return COMMON_SYMBOLS[normalized] || 'btcusdt'
}
