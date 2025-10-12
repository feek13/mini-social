# DeFiLlama API 客户端

提供统一的接口访问 [DeFiLlama](https://defillama.com/) 的各种数据 API。

## 功能特性

- 协议信息查询（列表、详情、搜索）
- 链数据获取
- 代币价格查询（实时、历史、批量）
- 收益率池子信息
- 完整的 TypeScript 类型支持
- 统一的错误处理

## 快速开始

### 基础用法

```typescript
import { defillama } from '@/lib/defillama'

// 获取所有协议
const protocols = await defillama.getProtocols()

// 获取单个协议详情
const aave = await defillama.getProtocol('aave')

// 搜索协议
const results = await defillama.searchProtocols('uniswap')
```

### 代币价格

```typescript
// 获取单个代币价格
const price = await defillama.getTokenPrice(
  'ethereum',
  '0x6B175474E89094C44Da98b954EedeAC495271d0F' // DAI
)
console.log(`DAI 价格: $${price.price}`)

// 批量获取代币价格
const prices = await defillama.getTokenPrices([
  { chain: 'ethereum', address: '0x...' },
  { chain: 'bsc', address: '0x...' }
])

// 获取历史价格
const yesterday = Math.floor(Date.now() / 1000) - 86400
const historicalPrice = await defillama.getHistoricalTokenPrice(
  'ethereum',
  '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  yesterday
)
```

### 收益率数据

```typescript
// 获取所有收益率池子
const pools = await defillama.getYields()

// 获取高收益池子（TVL > $1M）
const topYields = await defillama.getTopYields(10, 1000000)

topYields.forEach(pool => {
  console.log(`${pool.symbol} - APY: ${pool.apy}%`)
})
```

### 链数据

```typescript
// 获取所有链的 TVL
const chains = await defillama.getChains()

// 查找特定链
const ethereum = chains.find(c => c.name === 'Ethereum')
console.log(`Ethereum TVL: $${ethereum?.tvl}`)
```

### 高级查询

```typescript
// 按分类获取协议
const dexes = await defillama.getProtocolsByCategory('Dexes')

// 按链获取协议
const ethereumProtocols = await defillama.getProtocolsByChain('Ethereum')

// 获取 TVL 前 10 的协议
const top10 = await defillama.getTopProtocols(10)
```

## API 方法

### 协议相关

| 方法 | 说明 | 参数 |
|------|------|------|
| `getProtocols()` | 获取所有协议列表 | - |
| `getProtocol(slug)` | 获取协议详情 | `slug: string` |
| `searchProtocols(query)` | 搜索协议 | `query: string` |
| `getProtocolsByCategory(category)` | 按分类获取 | `category: string` |
| `getProtocolsByChain(chain)` | 按链获取 | `chain: string` |
| `getTopProtocols(limit)` | 获取 TVL 排名 | `limit?: number` |

### 代币价格

| 方法 | 说明 | 参数 |
|------|------|------|
| `getTokenPrice(chain, address)` | 获取单个代币价格 | `chain: string, address: string` |
| `getTokenPrices(tokens)` | 批量获取价格 | `tokens: TokenIdentifier[]` |
| `getHistoricalTokenPrice(chain, address, timestamp)` | 获取历史价格 | `chain: string, address: string, timestamp: number` |

### 收益率

| 方法 | 说明 | 参数 |
|------|------|------|
| `getYields()` | 获取所有收益率池子 | - |
| `getTopYields(limit, minTvl)` | 获取高收益池子 | `limit?: number, minTvl?: number` |

### 链数据

| 方法 | 说明 | 参数 |
|------|------|------|
| `getChains()` | 获取所有链的 TVL | - |

## 类型定义

```typescript
import type {
  Protocol,        // 协议基本信息
  ProtocolDetail,  // 协议详细信息
  Chain,           // 链信息
  TokenPrice,      // 代币价格
  YieldPool,       // 收益率池子
  TokenIdentifier  // 代币标识符
} from '@/lib/defillama'
```

## 错误处理

所有方法都会抛出错误，建议使用 try-catch 捕获：

```typescript
try {
  const protocol = await defillama.getProtocol('invalid-slug')
} catch (error) {
  console.error('获取协议失败:', error)
}
```

也可以使用 `isApiError` 类型守卫：

```typescript
import { isApiError } from '@/lib/defillama'

const response = await fetch('...')
const data = await response.json()

if (isApiError(data)) {
  console.error('API 错误:', data.error)
}
```

## 使用示例

### 在 API 路由中使用

```typescript
// app/api/defi/protocols/route.ts
import { NextResponse } from 'next/server'
import { defillama } from '@/lib/defillama'

export async function GET() {
  try {
    const protocols = await defillama.getProtocols()
    return NextResponse.json({ protocols })
  } catch (error) {
    return NextResponse.json(
      { error: '获取协议列表失败' },
      { status: 500 }
    )
  }
}
```

### 在服务端组件中使用

```typescript
// app/defi/page.tsx
import { defillama } from '@/lib/defillama'

export default async function DeFiPage() {
  const protocols = await defillama.getTopProtocols(10)

  return (
    <div>
      <h1>Top 10 DeFi Protocols</h1>
      {protocols.map(protocol => (
        <div key={protocol.id}>
          <h2>{protocol.name}</h2>
          <p>TVL: ${protocol.tvl.toLocaleString()}</p>
        </div>
      ))}
    </div>
  )
}
```

### 在客户端组件中使用

```typescript
'use client'

import { useEffect, useState } from 'react'
import type { Protocol } from '@/lib/defillama'

export default function ProtocolList() {
  const [protocols, setProtocols] = useState<Protocol[]>([])

  useEffect(() => {
    async function fetchProtocols() {
      const response = await fetch('/api/defi/protocols')
      const data = await response.json()
      setProtocols(data.protocols)
    }
    fetchProtocols()
  }, [])

  return (
    <ul>
      {protocols.map(p => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  )
}
```

## 常见链标识符

- `ethereum` - 以太坊
- `bsc` - BNB Chain
- `polygon` - Polygon
- `arbitrum` - Arbitrum
- `optimism` - Optimism
- `avalanche` - Avalanche
- `fantom` - Fantom
- `solana` - Solana

## 参考资源

- [DeFiLlama 官网](https://defillama.com/)
- [DeFiLlama API 文档](https://defillama.com/docs/api)
- [项目 GitHub](https://github.com/DefiLlama/DefiLlama-Adapters)
