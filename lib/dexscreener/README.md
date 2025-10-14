# DexScreener API 客户端

DexScreener API 集成，提供实时 DEX 交易对数据。

## 📚 文档

- **官方文档**: https://docs.dexscreener.com/api/reference
- **官网**: https://dexscreener.com/

## ✨ 特性

- ✅ **实时 DEX 数据**：价格、成交量、流动性
- ✅ **多链支持**：Ethereum, BSC, Polygon, Arbitrum, Base, Solana 等
- ✅ **交易对搜索**：按代币名称、符号或地址搜索
- ✅ **Trending & Boosted Tokens**：热门和推广代币
- ✅ **免费 API**：无需认证，300 requests/min
- ✅ **TypeScript 类型**：完整的类型定义

## 🚀 快速开始

### 基础用法

```typescript
import { dexscreener } from '@/lib/dexscreener'

// 1. 获取代币的所有交易对
const pairs = await dexscreener.getTokenPairs('ethereum', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')
console.log(`WETH has ${pairs.length} trading pairs`)

// 2. 搜索交易对
const results = await dexscreener.searchPairs('ETH USDC')
console.log(`Found ${results.length} pairs`)

// 3. 获取特定交易对详情
const pairDetails = await dexscreener.getPairDetails('ethereum', '0x...')

// 4. 获取推广的代币
const boosted = await dexscreener.getLatestBoostedTokens()
```

### 筛选和排序

```typescript
// 筛选高流动性、高成交量的交易对
const filtered = dexscreener.filterPairs(pairs, {
  minLiquidity: 1000000,  // $1M+
  minVolume24h: 100000,   // $100k+
  minPriceChange24h: 5,   // +5%
  boostedOnly: false,
})

// 按24h成交量排序
const sorted = filtered.sort((a, b) => b.volume.h24 - a.volume.h24)
```

### 计算 APY

```typescript
// 根据交易费用估算 APY
const apy = dexscreener.calculateEstimatedAPY(pair)
console.log(`Estimated APY: ${apy.toFixed(2)}%`)
```

## 📊 数据结构

### DexPair（交易对）

```typescript
interface DexPair {
  chainId: string
  dexId: string
  pairAddress: string

  // 代币信息
  baseToken: { address: string; name: string; symbol: string }
  quoteToken: { address: string; name: string; symbol: string }

  // 价格
  priceUsd: string
  priceNative: string

  // 成交量（5分钟、1小时、6小时、24小时）
  volume: {
    m5: number
    h1: number
    h6: number
    h24: number
  }

  // 价格变化百分比
  priceChange: {
    m5: number
    h1: number
    h6: number
    h24: number
  }

  // 交易笔数
  txns: {
    h24: { buys: number; sells: number }
    // ...
  }

  // 流动性
  liquidity?: {
    usd?: number
    base?: number
    quote?: number
  }

  // 市值和 FDV
  marketCap?: number
  fdv?: number

  // 推广信息
  boosts?: {
    active: number
  }
}
```

## 🔌 API 端点

### 1. Token Pairs

```typescript
// 获取代币的所有交易对
GET /token-pairs/v1/{chainId}/{tokenAddress}

// 示例
const pairs = await dexscreener.getTokenPairs('ethereum', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')
```

**限制**: 300 requests/min

### 2. Pair Details

```typescript
// 获取交易对详情（支持多个）
GET /latest/dex/pairs/{chainId}/{pairAddresses}

// 示例
const details = await dexscreener.getPairDetails('ethereum', ['0x...', '0x...'])
```

**限制**: 300 requests/min

### 3. Search Pairs

```typescript
// 搜索交易对
GET /latest/dex/search?q={query}

// 示例
const results = await dexscreener.searchPairs('WETH USDC')
```

**限制**: 300 requests/min

### 4. Boosted Tokens

```typescript
// 获取最新推广的代币
GET /token-boosts/latest/v1

// 获取推广最多的代币
GET /token-boosts/top/v1

// 示例
const latestBoosted = await dexscreener.getLatestBoostedTokens()
const topBoosted = await dexscreener.getTopBoostedTokens()
```

**限制**: 60 requests/min

### 5. Token Profiles

```typescript
// 获取最新的代币资料
GET /token-profiles/latest/v1

// 示例
const profiles = await dexscreener.getLatestTokenProfiles()
```

**限制**: 60 requests/min

## 🎯 使用场景

### 场景 1: 发现新的流动性池

```typescript
// 搜索 ETH-USDC 池子
const pools = await dexscreener.searchPairs('ETH USDC')

// 筛选高流动性池子
const highLiquidityPools = dexscreener.filterPairs(pools, {
  minLiquidity: 10000000,  // $10M+
  minVolume24h: 1000000,   // $1M+
})

// 计算 APY
const poolsWithAPY = highLiquidityPools.map(pool => ({
  ...pool,
  estimatedAPY: dexscreener.calculateEstimatedAPY(pool),
}))
```

### 场景 2: 监控价格变化

```typescript
// 获取 WETH 的所有交易对
const pairs = await dexscreener.getTokenPairs('ethereum', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')

// 找出24h价格变化最大的
const mostVolatile = pairs
  .sort((a, b) => Math.abs(b.priceChange.h24) - Math.abs(a.priceChange.h24))
  .slice(0, 10)

console.log('Most volatile pairs:', mostVolatile.map(p => ({
  symbol: `${p.baseToken.symbol}/${p.quoteToken.symbol}`,
  change: `${p.priceChange.h24.toFixed(2)}%`,
})))
```

### 场景 3: 发现热门代币

```typescript
// 获取推广的代币
const boostedTokens = await dexscreener.getLatestBoostedTokens()

// 获取这些代币的交易对
const boostedPairs = await Promise.all(
  boostedTokens.slice(0, 5).map(token =>
    dexscreener.getTokenPairs(token.chainId as ChainId, token.tokenAddress)
  )
)

// 展示热门代币
boostedPairs.forEach((pairs, idx) => {
  const token = boostedTokens[idx]
  const bestPair = pairs.sort((a, b) => b.volume.h24 - a.volume.h24)[0]

  console.log(`${token.chainId}:${token.tokenAddress}`)
  console.log(`  24h Volume: $${bestPair.volume.h24.toLocaleString()}`)
  console.log(`  Liquidity: $${bestPair.liquidity?.usd?.toLocaleString()}`)
})
```

## 🔄 与 DeFiLlama 对比

| 特性 | DexScreener | DeFiLlama |
|------|-------------|-----------|
| **数据类型** | DEX 交易对 | 协议 TVL + Yields |
| **更新频率** | 实时 | 小时级 |
| **覆盖范围** | DEX 专注 | 全 DeFi 生态 |
| **免费额度** | 300 req/min | 无限制 |
| **APY 数据** | 无（需估算） | ✅ 有 |
| **流动性数据** | ✅ 有 | ✅ 有 |
| **价格数据** | ✅ 实时 | ✅ 有 |
| **Trending** | ✅ Boosted | ❌ 无 |

**建议组合使用**：
- **DeFiLlama**：获取协议的收益率、TVL、历史数据
- **DexScreener**：获取实时交易对价格、流动性、成交量

## 📝 API 路由示例

### `/api/defi/dex/pairs`

```typescript
// app/api/defi/dex/pairs/route.ts
import { dexscreener } from '@/lib/dexscreener'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  const chain = searchParams.get('chain')
  const minLiquidity = searchParams.get('minLiquidity')

  try {
    let pairs = await dexscreener.searchPairs(query || '')

    // 筛选
    if (chain) {
      pairs = pairs.filter(p => p.chainId === chain)
    }

    if (minLiquidity) {
      pairs = dexscreener.filterPairs(pairs, {
        minLiquidity: parseInt(minLiquidity),
      })
    }

    return NextResponse.json({ data: pairs })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch pairs' },
      { status: 500 }
    )
  }
}
```

## ⚠️ 限制和注意事项

### API 限制

1. **Token 相关端点**: 60 requests/minute
   - `/token-boosts/latest/v1`
   - `/token-boosts/top/v1`
   - `/token-profiles/latest/v1`

2. **Pair/DEX 端点**: 300 requests/minute
   - `/token-pairs/v1/{chainId}/{tokenAddress}`
   - `/latest/dex/pairs/{chainId}/{pairId}`
   - `/latest/dex/search`

### 最佳实践

1. **缓存数据**：将结果缓存到 Supabase，减少 API 调用
2. **批量请求**：使用 `getBatchTokenPairs` 批量获取
3. **错误处理**：捕获 API 错误，提供 fallback
4. **Rate Limiting**：实现客户端限流，避免超限

### APY 估算注意事项

`calculateEstimatedAPY` 方法基于以下假设：
- 交易费用为 0.3%（Uniswap V2 标准）
- 不包括流动性挖矿奖励
- 不考虑无常损失

**建议**：将 DexScreener 的流动性数据与 DeFiLlama 的 APY 数据结合使用，获得更准确的收益预测。

## 🔗 相关链接

- [DexScreener 官网](https://dexscreener.com/)
- [API 文档](https://docs.dexscreener.com/api/reference)
- [API 条款](https://docs.dexscreener.com/api/api-terms-and-conditions)
