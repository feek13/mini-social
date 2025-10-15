# Moralis API 客户端

多链钱包数据查询客户端，支持获取钱包余额、NFT、交易历史等信息。

## 功能特性

- ✅ 支持 12+ EVM 链（Ethereum, BSC, Polygon, Arbitrum 等）
- ✅ 钱包余额查询（原生代币 + ERC20）
- ✅ NFT 资产查询
- ✅ 交易历史查询
- ✅ 多链数据聚合
- ✅ 批量钱包查询
- ✅ 垃圾代币过滤
- ✅ 自动缓存（5-60 分钟）

## 环境配置

在 `.env.local` 中添加 Moralis API Key：

```env
MORALIS_API_KEY=your_moralis_api_key_here
```

获取 API Key：https://moralis.io/

## 支持的链

| 链名称 | Chain ID | 原生代币 | 浏览器 |
|--------|----------|----------|--------|
| Ethereum | `0x1` | ETH | https://etherscan.io |
| BSC | `0x38` | BNB | https://bscscan.com |
| Polygon | `0x89` | MATIC | https://polygonscan.com |
| Arbitrum | `0xa4b1` | ETH | https://arbiscan.io |
| Optimism | `0xa` | ETH | https://optimistic.etherscan.io |
| Base | `0x2105` | ETH | https://basescan.org |
| Avalanche | `0xa86a` | AVAX | https://snowtrace.io |
| Fantom | `0xfa` | FTM | https://ftmscan.com |
| Cronos | `0x19` | CRO | https://cronoscan.com |
| Gnosis | `0x64` | xDAI | https://gnosisscan.io |
| Linea | `0xe708` | ETH | https://lineascan.build |
| zkSync Era | `0x144` | ETH | https://explorer.zksync.io |

## 基础用法

### 1. 获取钱包的原生代币余额

```typescript
import { moralis } from '@/lib/moralis'

// 获取以太坊上的 ETH 余额
const balance = await moralis.getNativeBalance(
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  'ethereum'
)

console.log(balance)
// {
//   balance: "1500000000000000000", // Wei
//   balance_formatted: "1.500000" // ETH
// }
```

### 2. 获取钱包的 ERC20 代币

```typescript
// 获取 BSC 上的代币余额
const tokens = await moralis.getTokenBalances(
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  'bsc',
  {
    excludeSpam: true, // 排除垃圾代币
    excludeUnverifiedContracts: true, // 排除未验证合约
  }
)

tokens.forEach(token => {
  console.log(`${token.symbol}: ${token.balance_formatted}`)
})
// USDT: 1000.000000
// BUSD: 500.000000
```

### 3. 获取钱包的 NFT

```typescript
const nfts = await moralis.getNFTs(
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  'ethereum',
  {
    limit: 50,
    excludeSpam: true,
  }
)

console.log(`Total NFTs: ${nfts.total}`)
nfts.result.forEach(nft => {
  console.log(`${nft.name} #${nft.token_id}`)
})
```

### 4. 获取交易历史

```typescript
const transactions = await moralis.getTransactions(
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  'ethereum',
  {
    limit: 10,
  }
)

transactions.result.forEach(tx => {
  console.log(`Hash: ${tx.hash}`)
  console.log(`From: ${tx.from_address}`)
  console.log(`To: ${tx.to_address}`)
  console.log(`Value: ${tx.value} Wei`)
})
```

### 5. 获取钱包完整快照（多链聚合）

```typescript
import { DEFAULT_CHAINS } from '@/lib/moralis'

// 获取钱包在所有主要链上的资产
const snapshot = await moralis.getWalletSnapshot(
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  DEFAULT_CHAINS
)

snapshot.chains.forEach(chainData => {
  console.log(`\n${chainData.chain}:`)
  console.log(`Native: ${chainData.native_balance.balance_formatted}`)
  console.log(`Tokens: ${chainData.tokens.length}`)
  console.log(`NFTs: ${chainData.nfts_count}`)
})
```

### 6. 批量查询多个钱包

```typescript
const addresses = [
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
]

const results = await moralis.getBatchWalletBalances(addresses, 'ethereum')

results.forEach(result => {
  if (result.error) {
    console.error(`${result.address}: Error - ${result.error}`)
  } else {
    console.log(`${result.address}: ${result.tokens.length} tokens`)
  }
})
```

## API 端点示例

创建 Next.js API 路由使用 Moralis：

### `/app/api/wallet/[address]/balance/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { moralis, DEFAULT_CHAINS } from '@/lib/moralis'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params

    // 获取多链余额
    const snapshot = await moralis.getWalletSnapshot(address, DEFAULT_CHAINS)

    return NextResponse.json({
      success: true,
      data: snapshot,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch wallet data',
      },
      { status: 500 }
    )
  }
}
```

### `/app/api/wallet/[address]/tokens/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { moralis } from '@/lib/moralis'
import type { EvmChain } from '@/types/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params
    const searchParams = request.nextUrl.searchParams
    const chain = (searchParams.get('chain') || 'ethereum') as EvmChain

    const tokens = await moralis.getTokenBalances(address, chain, {
      excludeSpam: true,
      excludeUnverifiedContracts: true,
    })

    return NextResponse.json({
      success: true,
      data: tokens,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch tokens',
      },
      { status: 500 }
    )
  }
}
```

## 工具函数

```typescript
import {
  formatAddress,
  isValidEthereumAddress,
  getChainConfig,
  getAllChains,
  isChainSupported,
} from '@/lib/moralis'

// 格式化地址（转小写）
const formatted = formatAddress('0xABCDEF...')

// 验证地址格式
if (isValidEthereumAddress('0x...')) {
  // 有效地址
}

// 获取链配置
const config = getChainConfig('ethereum')
console.log(config.native_token.symbol) // ETH

// 获取所有支持的链
const chains = getAllChains()

// 检查链是否支持
if (isChainSupported('ethereum')) {
  // 支持
}
```

## 缓存策略

Moralis API 响应会自动缓存：

- **余额数据**: 5 分钟
- **NFT 数据**: 15 分钟
- **交易历史**: 10 分钟
- **完整快照**: 1 小时

配置位于 `lib/moralis/config.ts` 的 `MORALIS_CONFIG.CACHE`。

## 速率限制

免费版限制：
- 每秒 5 个请求
- 每天 40,000 个请求

如需更高限制，请升级到付费计划：https://moralis.io/pricing/

## 错误处理

```typescript
try {
  const balance = await moralis.getNativeBalance(address, 'ethereum')
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('Invalid Ethereum address')) {
      // 地址格式错误
    } else if (error.message.includes('Moralis API error')) {
      // API 请求失败
    } else if (error.message.includes('API key not configured')) {
      // 未配置 API Key
    }
  }
}
```

## 最佳实践

1. **使用地址验证**
   ```typescript
   if (!isValidEthereumAddress(address)) {
     throw new Error('Invalid address')
   }
   ```

2. **排除垃圾代币**
   ```typescript
   const tokens = await moralis.getTokenBalances(address, chain, {
     excludeSpam: true,
     excludeUnverifiedContracts: true,
   })
   ```

3. **处理多链查询失败**
   ```typescript
   // getWalletSnapshot 使用 Promise.allSettled
   // 单个链失败不影响其他链
   const snapshot = await moralis.getWalletSnapshot(address, chains)
   ```

4. **批量查询时的错误处理**
   ```typescript
   const results = await moralis.getBatchWalletBalances(addresses, chain)
   const successful = results.filter(r => !r.error)
   ```

## 类型定义

所有类型定义位于 `types/database.ts`：

- `MoralisTokenBalance` - ERC20 代币余额
- `MoralisNativeBalance` - 原生代币余额
- `MoralisNFT` - NFT 数据
- `MoralisTransaction` - 交易记录
- `EvmChain` - 支持的链类型
- `ChainConfig` - 链配置

## 参考资料

- [Moralis 官方文档](https://docs.moralis.io/web3-data-api/evm)
- [Moralis API 参考](https://deep-index.moralis.io/api-docs-2.2/)
- [EVM 链列表](https://chainlist.org/)

## 常见问题

**Q: 为什么获取不到余额？**

A: 检查：
1. API Key 是否正确配置
2. 地址格式是否正确（0x 开头，40 位十六进制）
3. 链是否支持
4. 是否达到速率限制

**Q: 如何添加新的链？**

A: 在 `lib/moralis/config.ts` 的 `CHAIN_CONFIGS` 中添加配置：

```typescript
newchain: {
  id: 'newchain',
  name: 'New Chain',
  explorer_url: 'https://...',
  native_token: { symbol: 'NEW', decimals: 18 },
  moralis_chain_id: '0x...',
}
```

**Q: 如何计算代币的 USD 价值？**

A: Moralis 免费版不提供价格数据。需要集成额外的价格 API（如 CoinGecko, CoinMarketCap）或使用 DeFiLlama 的价格 API。

**Q: 支持测试网吗？**

A: Moralis 支持测试网，但需要修改 `moralis_chain_id`。例如 Goerli: `0x5`, Sepolia: `0xaa36a7`。
