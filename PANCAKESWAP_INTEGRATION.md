# PancakeSwap 集成说明

## 功能概述

已成功集成 PancakeSwap 数据到 DeFi 页面，支持：
- ✅ 查看 PancakeSwap 在各链上的收益率池子
- ✅ 点击"认购"按钮跳转到 PancakeSwap 官网
- ✅ 支持 BSC、Arbitrum、Base、Ethereum 等多条链

## 如何使用

### 1. 查看 PancakeSwap 池子

访问 http://localhost:3001/defi 页面，进入"发现"或"收益率"标签：

#### 方式 1：筛选查看
- 选择链：BSC、Arbitrum、Base 等
- 在搜索框输入："pancake"
- 即可看到所有 PancakeSwap 相关的池子

#### 方式 2：API 查询
```bash
# 查看所有 PancakeSwap 池子
curl "http://localhost:3001/api/defi/yields?protocol=pancake&limit=10"

# 查看 BSC 链上的 PancakeSwap 池子
curl "http://localhost:3001/api/defi/yields?chain=BSC&protocol=pancake&limit=10"
```

### 2. 认购功能

点击任何池子卡片上的"认购"按钮，将自动跳转到：

#### PancakeSwap V2 (pancakeswap-amm)
```
https://pancakeswap.finance/liquidity/pools?chain={链名称}
```
例如 BSC 链：
```
https://pancakeswap.finance/liquidity/pools?chain=bsc
```

#### PancakeSwap V3 (pancakeswap-amm-v3)
```
https://pancakeswap.finance/farms?chain={链名称}
```
例如 BSC 链：
```
https://pancakeswap.finance/farms?chain=bsc
```

## 支持的协议

除了 PancakeSwap，还支持以下协议的自动跳转：

| 协议 | 跳转链接 |
|------|---------|
| Uniswap | https://app.uniswap.org/pools |
| Aave | https://app.aave.com/ |
| Curve | https://curve.fi/#/{chain}/pools |
| Compound | https://app.compound.finance/ |
| Balancer | https://app.balancer.fi/#/pools |
| SushiSwap | https://www.sushi.com/pool |
| Yearn | https://yearn.finance/vaults |
| Lido | https://lido.fi/ |
| Convex | https://www.convexfinance.com/stake |

## 数据来源

### 当前数据源：DeFiLlama API

我们使用 DeFiLlama API 获取 PancakeSwap 的收益率数据，包括：
- ✅ APY（年化收益率）
- ✅ TVL（总锁仓价值）
- ✅ 池子符号（代币对）
- ✅ 链信息
- ✅ IL 风险等级
- ✅ 30天平均 APY
- ✅ 7天趋势

### 如何获取更多 PancakeSwap Earn 信息

如果需要更详细的 PancakeSwap 数据（如实时 Farm APR、Syrup Pool 信息等），可以考虑以下方案：

#### 方案 1：使用 PancakeSwap Subgraph（推荐）

PancakeSwap 在 The Graph 上维护了 Subgraph，可以查询链上数据：

```typescript
// 示例：查询 PancakeSwap V3 池子
const query = `
{
  pools(first: 10, orderBy: totalValueLockedUSD, orderDirection: desc) {
    id
    token0 {
      symbol
    }
    token1 {
      symbol
    }
    totalValueLockedUSD
    feeTier
  }
}
`

fetch('https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-bsc', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query })
})
```

#### 方案 2：使用第三方 API

- **Bitquery**: https://docs.bitquery.io/docs/blockchain/BSC/pancake-swap-api/
- **expand.network**: https://docs.expand.network/integrations/dex-and-dex-aggregators/pancakeswap-v2

#### 方案 3：直接调用智能合约

通过 Web3.js 或 ethers.js 直接读取 PancakeSwap 合约数据：

```typescript
import { ethers } from 'ethers'

// MasterChef V2 合约地址 (BSC)
const MASTERCHEF_V2 = '0xa5f8C5Dbd5F286960b9d90548680aE5ebFf07652'

// 读取池子信息
const provider = new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org/')
const contract = new ethers.Contract(MASTERCHEF_V2, ABI, provider)
const poolInfo = await contract.poolInfo(poolId)
```

## 实现细节

### 文件修改

1. **lib/defi-utils.ts** (defi-utils.ts:245-342)
   - 添加 `CHAIN_NETWORK_IDS` 映射
   - 实现 `getPoolInvestUrl()` 函数

2. **components/defi/YieldCard.tsx** (YieldCard.tsx:3, YieldCard.tsx:209-222)
   - 修改按钮为链接形式
   - 使用 `getPoolInvestUrl()` 生成跳转链接

## 测试

访问 http://localhost:3001/defi 并：
1. 进入"发现"标签
2. 选择 BSC 链
3. 查看 PancakeSwap 池子
4. 点击"认购"按钮，验证是否正确跳转

## 链支持

当前支持的链和对应的 Network ID：

| 链名称 | Network ID | 支持 PancakeSwap |
|--------|-----------|-----------------|
| BSC | 56 | ✅ V2, V3 |
| Ethereum | 1 | ✅ V3 |
| Arbitrum | 42161 | ✅ V3 |
| Base | 8453 | ✅ V3 |
| Polygon | 137 | ✅ V3 |
| zkSync | 324 | ✅ V3 |
| Linea | 59144 | ✅ V3 |

## 注意事项

1. **链名称大小写**：DeFiLlama API 返回的链名称可能是大写（如 "BSC"），我们的函数会自动转换为小写以匹配 PancakeSwap URL 格式

2. **V2 vs V3**：
   - V2 (pancakeswap-amm)：主要在 BSC 链上，使用 `/liquidity/pools` 页面
   - V3 (pancakeswap-amm-v3)：支持多链，使用 `/farms` 页面

3. **数据刷新**：DeFiLlama 数据每 30 分钟自动刷新一次

## 未来改进

- [ ] 添加 PancakeSwap Syrup Pools（单币质押）数据
- [ ] 集成 PancakeSwap Subgraph 获取更实时的数据
- [ ] 添加 Farm 奖励代币信息
- [ ] 支持查看历史 APY 曲线图
- [ ] 添加"收藏"功能，快速访问常用池子
