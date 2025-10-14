# DeFi 模块优化方案

## 📊 现状分析

### 当前架构问题

#### 1. **代码冗余**
- **PancakeSwap 客户端完全冗余**：`lib/pancakeswap/client.ts` (343行) 只是 DeFiLlama 的包装器
  - 所有方法都调用 `defillama.getYields()` 或 `defillama.getProtocol()`
  - 仅做简单的 `filter(pool => pool.project === 'pancakeswap')`
  - 可以用一个 10 行的工具函数替代

- **三个独立客户端缺乏统一**：
  - `defillama/client.ts` (385行) - 协议/收益率/历史数据
  - `pancakeswap/client.ts` (343行) - DeFiLlama 的重复封装
  - `dexscreener/client.ts` (324行) - 实时 DEX 数据（未集成）

- **页面组件过于庞大**：
  - `app/defi/page.tsx` (1763行) 包含所有标签页逻辑
  - 应拆分为独立组件

#### 2. **实时性不足**
- ❌ 仅价格查询有 WebSocket 实时更新（Binance）
- ❌ 协议和收益率数据无实时更新
- ❌ 依赖 API 轮询（10秒间隔），无法达到秒级更新
- ❌ DexScreener 已集成但未使用

#### 3. **性能瓶颈**
- 每次切换标签页都重新请求 API
- 无统一的缓存层
- 客户端做大量筛选和排序（应该服务端处理）
- 1763 行的单一组件导致重渲染开销大

---

## 🎯 优化目标

### 核心目标：**秒级实时更新**

> "能做多快做多块 最好秒级 你尽量帮我做到最快"

1. **协议数据**：1-2 秒更新（TVL 变化）
2. **收益率数据**：1-2 秒更新（APY 变化）
3. **价格数据**：毫秒级更新（已实现，保持）
4. **DEX 数据**：实时流式更新（利用 DexScreener）

---

## 🏗️ 统一架构设计

### 1. 统一 DeFi 客户端

#### **lib/defi/unified-client.ts** - 单一入口

```typescript
/**
 * 统一 DeFi 数据客户端
 *
 * 整合所有数据源：DeFiLlama、DexScreener、Binance
 * 提供统一的 API 和实时数据流
 */

import { defillama } from '@/lib/defillama/client'
import { dexscreener } from '@/lib/dexscreener/client'
import { BinanceWebSocketClient } from '@/lib/binance-websocket'

export class UnifiedDeFiClient {
  // ===== 数据源管理 =====
  private defillamaClient = defillama
  private dexscreenerClient = dexscreener
  private wsClients = new Map<string, any>()

  // ===== 实时订阅管理 =====
  private subscribers = new Map<string, Set<Function>>()

  // ========== 协议数据 ==========

  /**
   * 获取协议列表（带缓存和实时更新）
   */
  async getProtocols(options?: {
    cache?: boolean       // 是否使用缓存
    realtime?: boolean    // 是否启用实时更新
    callback?: (data: Protocol[]) => void
  }): Promise<Protocol[]> {
    // 1. 从缓存读取（Supabase）
    if (options?.cache) {
      const cached = await this.getCachedProtocols()
      if (cached) return cached
    }

    // 2. 获取新数据
    const protocols = await this.defillamaClient.getProtocols()

    // 3. 更新缓存
    await this.updateCache('protocols', protocols)

    // 4. 启用实时更新
    if (options?.realtime && options?.callback) {
      this.subscribeProtocolUpdates(options.callback)
    }

    return protocols
  }

  /**
   * 订阅协议实时更新（Server-Sent Events）
   */
  subscribeProtocolUpdates(callback: (data: Protocol[]) => void) {
    const channel = 'protocols'

    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set())
    }

    this.subscribers.get(channel)!.add(callback)

    // 启动 SSE 连接到 /api/defi/realtime/protocols
    this.connectSSE('/api/defi/realtime/protocols', (data) => {
      // 通知所有订阅者
      this.subscribers.get(channel)?.forEach(cb => cb(data))
    })

    return () => this.unsubscribe(channel, callback)
  }

  // ========== 收益率数据 ==========

  /**
   * 获取收益率（多源聚合）
   *
   * 数据源优先级：
   * 1. DexScreener (实时 DEX 数据)
   * 2. DeFiLlama (全面的收益率数据)
   */
  async getYields(options?: {
    chain?: string
    protocol?: string
    minApy?: number
    realtime?: boolean
    callback?: (data: YieldPool[]) => void
  }): Promise<YieldPool[]> {
    // 1. 获取 DeFiLlama 数据（基础数据）
    const llamaYields = await this.defillamaClient.getYields()

    // 2. 增强 DEX 池子的实时数据
    const enhancedYields = await this.enhanceWithDexScreener(llamaYields)

    // 3. 筛选
    let filtered = enhancedYields
    if (options?.chain) {
      filtered = filtered.filter(y => y.chain === options.chain)
    }
    if (options?.protocol) {
      filtered = filtered.filter(y => y.project === options.protocol)
    }
    if (options?.minApy) {
      filtered = filtered.filter(y => y.apy >= options.minApy)
    }

    // 4. 启用实时更新
    if (options?.realtime && options?.callback) {
      this.subscribeYieldUpdates(options, options.callback)
    }

    return filtered
  }

  /**
   * 用 DexScreener 实时数据增强收益率
   */
  private async enhanceWithDexScreener(yields: YieldPool[]): Promise<YieldPool[]> {
    // 识别 DEX 池子
    const dexPools = yields.filter(y =>
      ['uniswap', 'pancakeswap', 'sushiswap', 'curve'].includes(y.project.toLowerCase())
    )

    // 批量获取 DexScreener 实时数据
    const dexDataMap = new Map()

    for (const pool of dexPools) {
      try {
        // 根据池子信息搜索 DexScreener
        const pairs = await this.dexscreenerClient.searchPairs(pool.symbol)
        if (pairs.length > 0) {
          dexDataMap.set(pool.pool, pairs[0])
        }
      } catch (e) {
        console.warn(`Failed to enhance pool ${pool.pool}:`, e)
      }
    }

    // 合并数据
    return yields.map(pool => {
      const dexData = dexDataMap.get(pool.pool)
      if (dexData) {
        return {
          ...pool,
          // 用实时数据覆盖
          tvlUsd: dexData.liquidity?.usd || pool.tvlUsd,
          volume24h: dexData.volume.h24,
          priceChange24h: dexData.priceChange.h24,
          // 重新计算 APY（基于实时交易量）
          apy: this.dexscreenerClient.calculateEstimatedAPY(dexData),
          // 标记为实时数据
          _realtime: true,
          _lastUpdate: Date.now()
        }
      }
      return pool
    })
  }

  /**
   * 订阅收益率实时更新
   */
  subscribeYieldUpdates(
    filters: { chain?: string; protocol?: string },
    callback: (data: YieldPool[]) => void
  ) {
    const channel = `yields:${filters.chain || 'all'}:${filters.protocol || 'all'}`

    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set())
    }

    this.subscribers.get(channel)!.add(callback)

    // 启动 SSE 连接
    this.connectSSE('/api/defi/realtime/yields', (data) => {
      // 应用筛选
      let filtered = data
      if (filters.chain) {
        filtered = filtered.filter((y: YieldPool) => y.chain === filters.chain)
      }
      if (filters.protocol) {
        filtered = filtered.filter((y: YieldPool) => y.project === filters.protocol)
      }

      this.subscribers.get(channel)?.forEach(cb => cb(filtered))
    })

    return () => this.unsubscribe(channel, callback)
  }

  // ========== 价格数据 ==========

  /**
   * 获取代币价格（实时 WebSocket + DeFiLlama 备份）
   */
  async getTokenPrice(
    chain: string,
    address: string,
    options?: {
      realtime?: boolean
      callback?: (price: TokenPrice | BinanceTicker) => void
    }
  ): Promise<TokenPrice> {
    // 1. 获取 DeFiLlama 基础数据
    const price = await this.defillamaClient.getTokenPrice(chain, address)

    // 2. 如果需要实时更新，尝试 WebSocket
    if (options?.realtime && options?.callback) {
      try {
        // 尝试 Binance WebSocket
        const symbol = this.getSymbolForToken(price.symbol)
        const wsClient = new BinanceWebSocketClient(symbol)

        wsClient.subscribe(options.callback)
        wsClient.connect()

        this.wsClients.set(`price:${chain}:${address}`, wsClient)
      } catch (e) {
        // WebSocket 不可用，回退到轮询
        console.warn('WebSocket unavailable, falling back to polling')
        this.startPricePolling(chain, address, options.callback)
      }
    }

    return price
  }

  // ========== PancakeSwap 特定查询 ==========

  /**
   * 获取 PancakeSwap 池子（简化版）
   *
   * ❌ 移除独立的 PancakeSwap 客户端
   * ✅ 使用统一客户端的筛选功能
   */
  async getPancakeSwapPools(options?: {
    chain?: string
    minTvl?: number
    limit?: number
  }): Promise<YieldPool[]> {
    // 直接使用 getYields 并筛选
    const allYields = await this.getYields({
      chain: options?.chain,
      realtime: true
    })

    return allYields
      .filter(y => y.project === 'pancakeswap' || y.project === 'pancakeswap-amm')
      .filter(y => !options?.minTvl || y.tvlUsd >= options.minTvl)
      .sort((a, b) => b.tvlUsd - a.tvlUsd)
      .slice(0, options?.limit || 50)
  }

  // ========== 缓存管理 ==========

  /**
   * 从 Supabase 读取缓存
   */
  private async getCachedProtocols(): Promise<Protocol[] | null> {
    // 查询 defi_protocols 表
    // 如果数据不超过 5 分钟，返回缓存
    // 否则返回 null
    return null // 实现略
  }

  /**
   * 更新缓存到 Supabase
   */
  private async updateCache(type: string, data: any) {
    // 写入 Supabase 相应的缓存表
    // defi_protocols, defi_yields, etc.
  }

  // ========== SSE 连接管理 ==========

  /**
   * 连接到 Server-Sent Events 流
   */
  private connectSSE(endpoint: string, callback: (data: any) => void) {
    if (typeof window === 'undefined') return

    const eventSource = new EventSource(endpoint)

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      callback(data)
    }

    eventSource.onerror = (error) => {
      console.error('SSE error:', error)
      eventSource.close()
    }

    return eventSource
  }

  /**
   * 取消订阅
   */
  private unsubscribe(channel: string, callback: Function) {
    this.subscribers.get(channel)?.delete(callback)
  }

  /**
   * 断开所有连接
   */
  disconnect() {
    // 关闭所有 WebSocket
    this.wsClients.forEach(ws => ws.disconnect?.())
    this.wsClients.clear()

    // 清除所有订阅
    this.subscribers.clear()
  }

  // ========== 辅助方法 ==========

  private getSymbolForToken(symbol: string): string {
    // 映射代币符号到 Binance 交易对
    const map: Record<string, string> = {
      'WETH': 'ETHUSDT',
      'WBTC': 'BTCUSDT',
      'USDC': 'USDCUSDT',
      // ... 更多映射
    }
    return map[symbol.toUpperCase()] || `${symbol.toUpperCase()}USDT`
  }

  private startPricePolling(
    chain: string,
    address: string,
    callback: (price: TokenPrice) => void
  ) {
    // 每 2 秒轮询一次价格
    const interval = setInterval(async () => {
      try {
        const price = await this.defillamaClient.getTokenPrice(chain, address)
        callback(price)
      } catch (e) {
        console.error('Polling error:', e)
      }
    }, 2000)

    return () => clearInterval(interval)
  }
}

/**
 * 导出单例
 */
export const unifiedDeFi = new UnifiedDeFiClient()
```

---

### 2. 实时数据 API 路由

#### **app/api/defi/realtime/protocols/route.ts** - 协议实时流

```typescript
/**
 * Server-Sent Events (SSE) 实时协议数据流
 *
 * 每 2 秒推送更新的协议数据
 */

import { defillama } from '@/lib/defillama'

export const runtime = 'edge' // 使用 Edge Runtime 提升性能
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // 发送初始数据
      const initialData = await defillama.getProtocols()
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`)
      )

      // 每 2 秒推送更新
      const interval = setInterval(async () => {
        try {
          const data = await defillama.getProtocols()
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          )
        } catch (error) {
          console.error('SSE push error:', error)
        }
      }, 2000)

      // 清理
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

#### **app/api/defi/realtime/yields/route.ts** - 收益率实时流

```typescript
/**
 * SSE 实时收益率数据流
 *
 * 结合 DeFiLlama + DexScreener 提供秒级更新
 */

import { unifiedDeFi } from '@/lib/defi/unified-client'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const chain = searchParams.get('chain')
  const protocol = searchParams.get('protocol')

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // 发送初始数据
      const initialData = await unifiedDeFi.getYields({
        chain: chain || undefined,
        protocol: protocol || undefined
      })
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`)
      )

      // 每 2 秒推送更新（带 DexScreener 增强）
      const interval = setInterval(async () => {
        try {
          const data = await unifiedDeFi.getYields({
            chain: chain || undefined,
            protocol: protocol || undefined
          })
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          )
        } catch (error) {
          console.error('SSE push error:', error)
        }
      }, 2000)

      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

---

### 3. 组件拆分

#### **当前**: 单一 1763 行组件
```
app/defi/page.tsx (1763 lines)
└── 所有逻辑混在一起
```

#### **优化后**: 按标签页拆分
```
app/defi/
├── page.tsx (200 lines) - 主容器，只负责标签页切换
├── components/
│   ├── ProtocolsTab.tsx (400 lines)
│   ├── YieldsTab.tsx (400 lines)
│   ├── PricesTab.tsx (400 lines)
│   └── DiscoveryTab.tsx (200 lines)
└── hooks/
    ├── useRealtimeProtocols.ts - 协议实时数据 hook
    ├── useRealtimeYields.ts - 收益率实时数据 hook
    └── useRealtimePrice.ts - 价格实时数据 hook
```

#### **components/defi/ProtocolsTab.tsx** - 协议标签页

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRealtimeProtocols } from '@/app/defi/hooks/useRealtimeProtocols'
import ProtocolCard from '@/components/defi/ProtocolCard'
import ProtocolFilters from '@/components/defi/ProtocolFilters'

export default function ProtocolsTab() {
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    chains: [] as string[],
    tvlRange: 0
  })

  // 🚀 使用实时数据 hook
  const { protocols, loading, error } = useRealtimeProtocols({
    filters,
    realtime: true // 启用实时更新
  })

  return (
    <div>
      <ProtocolFilters filters={filters} onChange={setFilters} />

      {loading && <ProtocolsSkeleton />}

      {!loading && protocols.length === 0 && <EmptyState />}

      {!loading && protocols.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {protocols.map(protocol => (
            <ProtocolCard key={protocol.id} protocol={protocol} />
          ))}
        </div>
      )}
    </div>
  )
}
```

#### **hooks/useRealtimeProtocols.ts** - 实时协议 Hook

```typescript
'use client'

import { useState, useEffect } from 'react'
import { unifiedDeFi } from '@/lib/defi/unified-client'
import type { Protocol } from '@/lib/defillama/types'

interface Options {
  filters?: {
    search?: string
    category?: string
    chains?: string[]
    tvlRange?: number
  }
  realtime?: boolean
  refreshInterval?: number
}

export function useRealtimeProtocols(options: Options = {}) {
  const [protocols, setProtocols] = useState<Protocol[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        const data = await unifiedDeFi.getProtocols({
          cache: true,
          realtime: options.realtime,
          callback: (updatedData) => {
            // 实时更新回调
            setProtocols(updatedData)
            setLastUpdate(new Date())
          }
        })

        setProtocols(data)
        setLastUpdate(new Date())
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取协议列表失败')
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    return () => {
      unsubscribe?.()
      unifiedDeFi.disconnect()
    }
  }, [options.realtime])

  // 客户端筛选（实时响应）
  const filteredProtocols = protocols.filter(p => {
    if (options.filters?.search) {
      const query = options.filters.search.toLowerCase()
      if (!p.name.toLowerCase().includes(query) &&
          !p.symbol.toLowerCase().includes(query)) {
        return false
      }
    }

    if (options.filters?.category && p.category !== options.filters.category) {
      return false
    }

    if (options.filters?.chains && options.filters.chains.length > 0) {
      if (!options.filters.chains.some(c => p.chains.includes(c))) {
        return false
      }
    }

    return true
  })

  return {
    protocols: filteredProtocols,
    loading,
    error,
    lastUpdate,
    refresh: () => setProtocols([...protocols]) // 强制刷新
  }
}
```

---

### 4. 缓存策略

#### Supabase 缓存层

```sql
-- defi_protocols 表增加实时更新字段
ALTER TABLE defi_protocols ADD COLUMN last_realtime_update TIMESTAMPTZ;
ALTER TABLE defi_protocols ADD COLUMN realtime_enabled BOOLEAN DEFAULT FALSE;

-- defi_yields 表同样处理
ALTER TABLE defi_yields ADD COLUMN last_realtime_update TIMESTAMPTZ;
ALTER TABLE defi_yields ADD COLUMN realtime_source TEXT; -- 'defillama' | 'dexscreener'
```

#### 缓存读取逻辑

```typescript
/**
 * 智能缓存策略
 *
 * 1. 如果缓存数据 < 5 分钟，直接返回
 * 2. 如果 5-10 分钟，后台刷新，返回缓存
 * 3. 如果 > 10 分钟，强制刷新
 */
async function getProtocolsWithCache(): Promise<Protocol[]> {
  const cached = await supabase
    .from('defi_protocols')
    .select('*')
    .order('tvl', { ascending: false })
    .limit(100)

  if (cached.data && cached.data.length > 0) {
    const lastUpdate = new Date(cached.data[0].updated_at)
    const age = Date.now() - lastUpdate.getTime()

    // < 5 分钟：直接返回
    if (age < 5 * 60 * 1000) {
      return cached.data
    }

    // 5-10 分钟：返回缓存 + 后台刷新
    if (age < 10 * 60 * 1000) {
      refreshProtocolsInBackground()
      return cached.data
    }
  }

  // > 10 分钟或无缓存：强制刷新
  return await refreshProtocols()
}
```

---

## 📦 实施步骤

### Phase 1: 清理冗余 (1-2 天)

1. **移除 PancakeSwap 客户端**
   - ❌ 删除 `lib/pancakeswap/client.ts`
   - ❌ 删除 `lib/pancakeswap/types.ts`
   - ✅ 创建 `lib/defi/filters.ts` 工具函数：
     ```typescript
     export function filterPancakeSwapPools(pools: YieldPool[]): YieldPool[] {
       return pools.filter(p =>
         p.project === 'pancakeswap' || p.project === 'pancakeswap-amm'
       )
     }
     ```

2. **拆分 page.tsx**
   - 创建 `app/defi/components/` 目录
   - 将四个标签页拆分为独立组件
   - 提取共享逻辑到 hooks

### Phase 2: 统一客户端 (2-3 天)

1. **创建 UnifiedDeFiClient**
   - 实现 `lib/defi/unified-client.ts`
   - 整合 DeFiLlama + DexScreener + Binance
   - 提供统一 API 和实时订阅

2. **更新所有调用点**
   - 将 `defillama.getProtocols()` 改为 `unifiedDeFi.getProtocols({ realtime: true })`
   - 将 `defillama.getYields()` 改为 `unifiedDeFi.getYields({ realtime: true })`

### Phase 3: 实时数据流 (2-3 天)

1. **创建 SSE API 路由**
   - `/api/defi/realtime/protocols` - 协议实时流
   - `/api/defi/realtime/yields` - 收益率实时流
   - `/api/defi/realtime/dex` - DEX 实时流

2. **实现实时订阅 Hooks**
   - `useRealtimeProtocols()`
   - `useRealtimeYields()`
   - `useRealtimePrice()` (已存在，优化)

3. **DexScreener 集成**
   - 用 DexScreener 增强 DEX 池子数据
   - 每 2 秒更新流动性和成交量

### Phase 4: 优化缓存 (1-2 天)

1. **Supabase 缓存增强**
   - 添加 `last_realtime_update` 字段
   - 实现智能缓存逻辑

2. **后台刷新任务**
   - 使用 Vercel Cron Jobs 每 5 分钟刷新缓存
   - 或使用 Supabase Edge Functions

### Phase 5: 性能测试 (1 天)

1. **压力测试**
   - 测试 SSE 连接数上限
   - 测试数据推送延迟

2. **优化**
   - 调整推送间隔（1-3 秒之间找最佳值）
   - 减少不必要的数据传输（只传变化的数据）

---

## 📈 性能对比

### 优化前
```
协议数据更新: 手动刷新 (无实时更新)
收益率更新: 手动刷新 (无实时更新)
价格更新: 10秒轮询 或 WebSocket (仅部分代币)
页面大小: 1763 lines (单文件)
代码冗余: 343 lines (PancakeSwap 客户端)
```

### 优化后
```
协议数据更新: 2 秒自动推送 (SSE) ⚡
收益率更新: 2 秒自动推送 (SSE + DexScreener) ⚡⚡
价格更新: 毫秒级 WebSocket (所有主流代币) ⚡⚡⚡
页面大小: ~200 lines 主容器 + 4 个独立组件 (易维护)
代码冗余: 0 lines (完全移除)
缓存层: Supabase 智能缓存 (5分钟过期)
```

---

## 🎯 实时性能目标

| 数据类型 | 目标延迟 | 实现方式 | 状态 |
|---------|---------|---------|------|
| 价格数据 | **< 100ms** | Binance WebSocket | ✅ 已实现 |
| DEX 流动性 | **1-2 秒** | DexScreener + SSE | 🔄 待实现 |
| 协议 TVL | **2 秒** | DeFiLlama + SSE | 🔄 待实现 |
| 收益率 APY | **2 秒** | DeFiLlama + DexScreener + SSE | 🔄 待实现 |

---

## 💡 技术亮点

1. **多源数据融合**
   - DeFiLlama (全面数据) + DexScreener (实时数据) + Binance (价格数据)
   - 智能选择最佳数据源

2. **渐进式实时更新**
   - 初始加载：从缓存读取（瞬时）
   - 2 秒后：推送第一次更新
   - 持续推送：每 2 秒更新

3. **优雅降级**
   - WebSocket 不可用 → 回退到 SSE
   - SSE 不可用 → 回退到轮询
   - 所有 API 失败 → 显示缓存数据

4. **智能缓存**
   - 读取缓存（< 5 分钟）
   - 后台刷新（5-10 分钟）
   - 强制刷新（> 10 分钟）

---

## 🚀 预期收益

1. **用户体验**
   - ✅ 秒级数据更新（满足核心需求）
   - ✅ 无需手动刷新
   - ✅ 更快的页面加载（缓存）

2. **开发体验**
   - ✅ 代码量减少 ~40% (移除冗余)
   - ✅ 组件化，易于维护
   - ✅ 统一 API，降低学习成本

3. **性能提升**
   - ✅ 减少 API 请求（智能缓存）
   - ✅ 减少客户端渲染开销（组件拆分）
   - ✅ 真正的实时数据流（SSE + WebSocket）

---

## 📋 检查清单

### 必做项
- [ ] 删除 `lib/pancakeswap/` 目录
- [ ] 创建 `lib/defi/unified-client.ts`
- [ ] 拆分 `app/defi/page.tsx` 为 4 个组件
- [ ] 创建实时 API 路由 (`/api/defi/realtime/*`)
- [ ] 实现 `useRealtimeProtocols` hook
- [ ] 实现 `useRealtimeYields` hook
- [ ] 集成 DexScreener 数据增强
- [ ] 优化 Supabase 缓存策略

### 可选项
- [ ] 添加 Vercel Cron Job 后台刷新
- [ ] 实现数据压缩（gzip）减少传输
- [ ] 添加性能监控（Sentry）
- [ ] 实现断线重连逻辑
- [ ] 添加数据可视化（实时图表）

---

## 🔗 相关文档

- [DeFiLlama API 文档](lib/defillama/README.md)
- [DexScreener API 文档](lib/dexscreener/README.md)
- [Binance WebSocket 文档](lib/binance-websocket.ts)
- [Server-Sent Events 规范](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Next.js Edge Runtime](https://nextjs.org/docs/app/building-your-application/rendering/edge-and-nodejs-runtimes)
