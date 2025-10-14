# PancakeSwap 集成方案

> 将 PancakeSwap 的池子和协议数据集成到 MiniSocial 的 DeFi 发现页面

## 目录
- [项目概述](#项目概述)
- [PancakeSwap 技术架构](#pancakeswap-技术架构)
- [数据源分析](#数据源分析)
- [集成方案](#集成方案)
- [实施步骤](#实施步骤)
- [API 示例](#api-示例)
- [前端组件](#前端组件)
- [数据缓存策略](#数据缓存策略)
- [测试计划](#测试计划)

---

## 项目概述

### 目标
将 PancakeSwap 的流动性池、收益率、Farm 等数据集成到 MiniSocial 的 `/defi` 发现页面，为用户提供：
- PancakeSwap 协议信息和 TVL
- 高收益池子推荐
- Farm 收益率数据
- 跨链池子对比
- 实时 APY/APR 跟踪

### 技术栈
- **后端**：Next.js API Routes
- **数据库**：Supabase (PostgreSQL)
- **数据源**：DefiLlama API + The Graph Subgraph (可选)
- **前端**：React + TypeScript + Tailwind CSS

---

## PancakeSwap 技术架构

### 版本概览
| 版本 | 架构 | 特点 | 支持链 |
|------|------|------|--------|
| **V2** | Uniswap V2 Fork | 恒定乘积 AMM (x*y=k) | BSC, ETH, ARB, zkSync, Linea, Base, opBNB |
| **V3** | Concentrated Liquidity | 集中流动性，资本效率更高 | BSC, ETH, ARB, Polygon zkEVM, zkSync, Linea, Base, opBNB |
| **Infinity** | 三层模块化架构 | Vault + Pool Manager + Hooks | BSC (2025年3月已完成审计) |
| **StableSwap** | Curve 稳定币优化 | 低滑点稳定币交易 | BSC, ARB |

### PancakeSwap Infinity 架构

```
┌─────────────────────────────────────────────┐
│         Custom Layer (Hooks)                │
│  - Custom Oracles                           │
│  - Dynamic Fees                             │
│  - Active Liquidity Management             │
├─────────────────────────────────────────────┤
│         AMM Layer (Pool Manager)            │
│  - CLPoolManager (Concentrated Liquidity)   │
│  - BinPoolManager (Liquidity Book)          │
├─────────────────────────────────────────────┤
│      Accounting Layer (Vault)               │
│  - Flash Accounting                         │
│  - Singleton Design                         │
│  - Gas Optimization                         │
└─────────────────────────────────────────────┘
```

### 关键概念

#### 1. Pool Key
每个池子由 `PoolKey` 唯一标识：
```typescript
interface PoolKey {
  currency0: string;      // 代币0地址
  currency1: string;      // 代币1地址
  hooks: string;          // Hook 合约地址
  poolManager: string;    // Pool Manager 地址
  fee: number;           // 手续费（最高1,000,000）
  parameters: string;    // 参数（tick spacing等）
}
```

#### 2. Concentrated Liquidity (V3/Infinity)
- **Tick**: 价格点，价格 = 1.0001^tick
- **Tick Spacing**: 最小价格移动间隔（1/10/50/100）
- **sqrtPriceX96**: 价格的平方根（Q64.96 格式）

#### 3. Farm 机制
- **MasterChef V3**: 流动性挖矿合约
- **Syrup Pools**: 单币质押池
- **Gauge Voting**: veCake 治理

---

## 数据源分析

### 1. DefiLlama API ⭐ 推荐作为主要数据源

**优势**：
- ✅ 已集成到项目中
- ✅ 数据可靠，来源广泛
- ✅ 包含 TVL、APY、池子信息
- ✅ 支持多链数据聚合
- ✅ 免费且无需 API Key

**API 端点**：
```
GET https://api.llama.fi/protocol/pancakeswap-amm
GET https://yields.llama.fi/pools
GET https://coins.llama.fi/prices/current/{chain}:{address}
```

**可用数据**：
- 协议总 TVL 和历史数据
- 各链 TVL 分布
- 收益率池子列表（APY、APR、TVL、volume）
- 代币价格

### 2. The Graph Subgraph（补充数据源）

**优势**：
- ✅ 实时链上数据
- ✅ 详细的池子信息
- ✅ 支持复杂 GraphQL 查询
- ⚠️ 需要熟悉 GraphQL
- ⚠️ 每个链有独立的 Subgraph

**Subgraph 端点**（BSC 为例）：
```
V2: https://nodereal.io/meganode/api-marketplace/pancakeswap-graphql
V3: https://thegraph.com/explorer/subgraphs/Hv1GncLY5docZoGtXjo4kwbTvxm3MAhVZqBZE4sUT9eZ
MasterChef V3: https://thegraph.com/explorer/subgraphs/QProcZexB8KYHueG55aoLhBmwnLXExxopq7CUnFkjMv
```

**GraphQL 查询示例**：
```graphql
{
  pools(first: 10, orderBy: totalValueLockedUSD, orderDirection: desc) {
    id
    token0 { symbol }
    token1 { symbol }
    totalValueLockedUSD
    volumeUSD
    feeTier
  }
}
```

### 3. Bitquery API（可选）

**优势**：
- ✅ 灵活的 GraphQL API
- ✅ 实时交易数据
- ⚠️ 需要注册和 API Key
- ⚠️ 免费额度有限

**示例查询**：
```graphql
{
  ethereum(network: bsc) {
    dexTrades(
      exchangeName: {in: ["Pancake", "Pancake v2"]}
      date: {after: "2025-01-01"}
    ) {
      count
      tradeAmount(in: USD)
      buyCurrency { symbol }
      sellCurrency { symbol }
    }
  }
}
```

### 4. 官方 Info API（参考）

**仓库**: https://github.com/pancakeswap/pancake-info-api

用于 CoinMarketCap 等聚合器，基于 Subgraph 数据。

---

## 集成方案

### 推荐方案：混合策略

```
┌─────────────────────────────────────────────────────┐
│              前端 (DeFi 发现页面)                    │
│  - 协议卡片（PancakeSwap）                           │
│  - 高收益池子推荐                                    │
│  - Farm APR 排行                                     │
│  - 跨链数据对比                                      │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│           API Routes (Next.js)                      │
│  - GET /api/defi/pancakeswap/overview               │
│  - GET /api/defi/pancakeswap/pools                  │
│  - GET /api/defi/pancakeswap/farms                  │
│  - GET /api/defi/pancakeswap/yields                 │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│          数据聚合层 (lib/pancakeswap/)               │
│  - client.ts: API 客户端                            │
│  - types.ts: TypeScript 类型                        │
│  - utils.ts: 数据处理工具                           │
└───────────────────┬─────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼──────────┐   ┌────────▼────────┐
│  DefiLlama API   │   │  Supabase Cache │
│  (主要数据源)     │   │  (5-15分钟缓存)  │
└──────────────────┘   └─────────────────┘
```

### 数据流程

1. **用户访问 `/defi` 页面**
2. **前端请求** → `/api/defi/pancakeswap/pools?chain=bsc&limit=20`
3. **API 检查缓存**：
   - 如果缓存有效（< 5分钟）→ 返回缓存数据
   - 如果缓存过期 → 继续步骤4
4. **调用 DefiLlama API**：
   - 获取 PancakeSwap 池子数据
   - 过滤和处理数据
5. **更新 Supabase 缓存**
6. **返回数据给前端**
7. **前端渲染**：使用现有的 `YieldCard`、`ProtocolCard` 组件

---

## 实施步骤

### Phase 1: 数据层（1-2天）

#### 1.1 创建 PancakeSwap 客户端

**文件**: `lib/pancakeswap/client.ts`

```typescript
import { defillama } from '@/lib/defillama';

export class PancakeSwapClient {
  // 获取协议概览
  async getProtocol() {
    return defillama.getProtocol('pancakeswap-amm');
  }

  // 获取池子列表
  async getPools(options: {
    chain?: string;
    minTvl?: number;
    limit?: number;
  }) {
    const pools = await defillama.getYields({
      protocol: 'pancakeswap',
      chain: options.chain,
    });

    return pools
      .filter(p => p.tvlUsd >= (options.minTvl || 0))
      .slice(0, options.limit || 50);
  }

  // 获取 Farm 数据
  async getFarms(chain: string = 'bsc') {
    const pools = await this.getPools({ chain });
    return pools.filter(p => p.project === 'pancakeswap' && p.rewardTokens?.length);
  }

  // 获取高收益池子
  async getTopYields(minTvl: number = 100000, limit: number = 10) {
    const pools = await this.getPools({ minTvl });
    return pools
      .sort((a, b) => b.apy - a.apy)
      .slice(0, limit);
  }
}

export const pancakeswap = new PancakeSwapClient();
```

#### 1.2 定义 TypeScript 类型

**文件**: `lib/pancakeswap/types.ts`

```typescript
export interface PancakeSwapPool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyBase?: number;
  apyReward?: number;
  rewardTokens?: string[];
  underlyingTokens: string[];
  poolMeta?: string; // "V2" | "V3" | "StableSwap"
  url?: string;
}

export interface PancakeSwapProtocol {
  id: string;
  name: string;
  address: string;
  symbol: string;
  url: string;
  description: string;
  chain: string;
  logo: string;
  audits: string;
  category: string;
  chains: string[];
  tvl: number;
  chainTvls: Record<string, number>;
  change_1h?: number;
  change_1d?: number;
  change_7d?: number;
}

export interface PancakeSwapFarm extends PancakeSwapPool {
  farmType: 'LP' | 'Single' | 'StableLP';
  rewardApy: number;
  harvestInterval?: number;
}
```

#### 1.3 创建数据库表（Supabase）

**文件**: `supabase/migrations/pancakeswap.sql`

```sql
-- PancakeSwap 池子缓存表
CREATE TABLE IF NOT EXISTS pancakeswap_pools (
  id TEXT PRIMARY KEY,
  chain TEXT NOT NULL,
  symbol TEXT NOT NULL,
  pool_meta TEXT, -- "V2" | "V3" | "StableSwap"
  tvl_usd DECIMAL NOT NULL,
  apy DECIMAL NOT NULL,
  apy_base DECIMAL,
  apy_reward DECIMAL,
  volume_usd_24h DECIMAL,
  fees_usd_24h DECIMAL,
  reward_tokens TEXT[], -- 奖励代币地址
  underlying_tokens TEXT[] NOT NULL, -- 底层代币地址
  pool_url TEXT,
  data JSONB NOT NULL, -- 完整的池子数据
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_pancakeswap_pools_chain ON pancakeswap_pools(chain);
CREATE INDEX IF NOT EXISTS idx_pancakeswap_pools_tvl ON pancakeswap_pools(tvl_usd DESC);
CREATE INDEX IF NOT EXISTS idx_pancakeswap_pools_apy ON pancakeswap_pools(apy DESC);
CREATE INDEX IF NOT EXISTS idx_pancakeswap_pools_updated ON pancakeswap_pools(updated_at);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_pancakeswap_pools_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pancakeswap_pools_updated_at
BEFORE UPDATE ON pancakeswap_pools
FOR EACH ROW EXECUTE FUNCTION update_pancakeswap_pools_updated_at();

-- RLS 策略（所有人可读）
ALTER TABLE pancakeswap_pools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read pancakeswap pools" ON pancakeswap_pools FOR SELECT USING (true);
```

### Phase 2: API 层（1天）

#### 2.1 协议概览 API

**文件**: `app/api/defi/pancakeswap/overview/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { pancakeswap } from '@/lib/pancakeswap/client';

export async function GET(request: NextRequest) {
  try {
    const protocol = await pancakeswap.getProtocol();

    return NextResponse.json({
      name: protocol.name,
      tvl: protocol.tvl,
      chains: protocol.chains,
      chainTvls: protocol.chainTvls,
      category: protocol.category,
      logo: protocol.logo,
      url: protocol.url,
      change_1d: protocol.change_1d,
      change_7d: protocol.change_7d,
    });
  } catch (error) {
    console.error('Error fetching PancakeSwap overview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch protocol overview' },
      { status: 500 }
    );
  }
}
```

#### 2.2 池子列表 API

**文件**: `app/api/defi/pancakeswap/pools/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { pancakeswap } from '@/lib/pancakeswap/client';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chain = searchParams.get('chain') || undefined;
    const minTvl = parseInt(searchParams.get('minTvl') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');

    // 1. 检查缓存
    const { data: cached } = await supabase
      .from('pancakeswap_pools')
      .select('*')
      .gte('updated_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order('tvl_usd', { ascending: false })
      .limit(limit);

    if (cached && cached.length > 0) {
      return NextResponse.json({
        pools: cached.map(c => c.data),
        cached: true,
      });
    }

    // 2. 获取新数据
    const pools = await pancakeswap.getPools({ chain, minTvl, limit });

    // 3. 更新缓存
    const poolRecords = pools.map(pool => ({
      id: pool.pool,
      chain: pool.chain,
      symbol: pool.symbol,
      pool_meta: pool.poolMeta,
      tvl_usd: pool.tvlUsd,
      apy: pool.apy,
      apy_base: pool.apyBase,
      apy_reward: pool.apyReward,
      reward_tokens: pool.rewardTokens,
      underlying_tokens: pool.underlyingTokens,
      pool_url: pool.url,
      data: pool,
    }));

    await supabase
      .from('pancakeswap_pools')
      .upsert(poolRecords, { onConflict: 'id' });

    return NextResponse.json({
      pools,
      cached: false,
    });
  } catch (error) {
    console.error('Error fetching PancakeSwap pools:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pools' },
      { status: 500 }
    );
  }
}
```

#### 2.3 Farm 数据 API

**文件**: `app/api/defi/pancakeswap/farms/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { pancakeswap } from '@/lib/pancakeswap/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chain = searchParams.get('chain') || 'bsc';

    const farms = await pancakeswap.getFarms(chain);

    return NextResponse.json({
      farms: farms.map(farm => ({
        ...farm,
        farmType: farm.rewardTokens?.length === 1 ? 'Single' : 'LP',
        rewardApy: farm.apyReward || 0,
      })),
    });
  } catch (error) {
    console.error('Error fetching PancakeSwap farms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch farms' },
      { status: 500 }
    );
  }
}
```

### Phase 3: 前端组件（2天）

#### 3.1 PancakeSwap 协议卡片

**文件**: `components/defi/PancakeSwapCard.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface PancakeSwapOverview {
  name: string;
  tvl: number;
  chains: string[];
  change_1d?: number;
  logo: string;
  url: string;
}

export function PancakeSwapCard() {
  const [data, setData] = useState<PancakeSwapOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/defi/pancakeswap/overview')
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="animate-pulse bg-gray-200 rounded-lg h-32" />;
  }

  if (!data) return null;

  const isPositive = (data.change_1d || 0) >= 0;

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <img src={data.logo} alt={data.name} className="w-12 h-12 rounded-full" />
          <div>
            <h3 className="font-bold text-lg">{data.name}</h3>
            <p className="text-sm text-gray-500">{data.chains.length} chains</p>
          </div>
        </div>
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-600"
        >
          Visit →
        </a>
      </div>

      <div className="mt-4">
        <div className="text-2xl font-bold">${formatNumber(data.tvl)}</div>
        <div className="text-sm text-gray-500">Total Value Locked</div>
        {data.change_1d !== undefined && (
          <div className={`flex items-center gap-1 mt-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {Math.abs(data.change_1d).toFixed(2)}% (24h)
          </div>
        )}
      </div>
    </div>
  );
}
```

#### 3.2 PancakeSwap 池子列表

**文件**: `components/defi/PancakeSwapPools.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { YieldCard } from '@/components/defi/YieldCard';
import type { PancakeSwapPool } from '@/lib/pancakeswap/types';

interface Props {
  chain?: string;
  limit?: number;
}

export function PancakeSwapPools({ chain, limit = 20 }: Props) {
  const [pools, setPools] = useState<PancakeSwapPool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (chain) params.append('chain', chain);
    if (limit) params.append('limit', limit.toString());

    fetch(`/api/defi/pancakeswap/pools?${params}`)
      .then(res => res.json())
      .then(data => setPools(data.pools))
      .finally(() => setLoading(false));
  }, [chain, limit]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-48" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">PancakeSwap Pools</h2>
        <div className="text-sm text-gray-500">{pools.length} pools</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pools.map(pool => (
          <YieldCard
            key={pool.pool}
            pool={pool.pool}
            chain={pool.chain}
            project={pool.project}
            symbol={pool.symbol}
            tvlUsd={pool.tvlUsd}
            apy={pool.apy}
            apyBase={pool.apyBase}
            apyReward={pool.apyReward}
            rewardTokens={pool.rewardTokens}
            poolMeta={pool.poolMeta}
            url={pool.url}
          />
        ))}
      </div>
    </div>
  );
}
```

#### 3.3 更新 DeFi 发现页面

**文件**: `app/defi/page.tsx`

```typescript
import { PancakeSwapCard } from '@/components/defi/PancakeSwapCard';
import { PancakeSwapPools } from '@/components/defi/PancakeSwapPools';
// ... 其他导入

export default function DeFiPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">DeFi Discovery</h1>

      {/* PancakeSwap 协议卡片 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Featured Protocol</h2>
        <PancakeSwapCard />
      </section>

      {/* 高收益池子 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Top PancakeSwap Yields</h2>
        <PancakeSwapPools limit={12} />
      </section>

      {/* 按链筛选 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">BSC Pools</h2>
        <PancakeSwapPools chain="bsc" limit={20} />
      </section>

      {/* ... 其他 DeFi 内容 */}
    </div>
  );
}
```

### Phase 4: 测试与优化（1天）

#### 4.1 创建测试脚本

**文件**: `scripts/test-pancakeswap.ts`

```typescript
import { pancakeswap } from '@/lib/pancakeswap/client';

async function testPancakeSwap() {
  console.log('Testing PancakeSwap API integration...\n');

  // 1. 测试协议概览
  console.log('1. Fetching protocol overview...');
  const protocol = await pancakeswap.getProtocol();
  console.log(`   TVL: $${protocol.tvl.toLocaleString()}`);
  console.log(`   Chains: ${protocol.chains.join(', ')}\n`);

  // 2. 测试池子列表
  console.log('2. Fetching pools (BSC, TVL > $100k)...');
  const pools = await pancakeswap.getPools({ chain: 'bsc', minTvl: 100000, limit: 10 });
  console.log(`   Found ${pools.length} pools`);
  pools.slice(0, 3).forEach(p => {
    console.log(`   - ${p.symbol}: APY ${p.apy.toFixed(2)}%, TVL $${p.tvlUsd.toLocaleString()}`);
  });
  console.log();

  // 3. 测试 Farm 数据
  console.log('3. Fetching farms...');
  const farms = await pancakeswap.getFarms('bsc');
  console.log(`   Found ${farms.length} farms with rewards`);
  farms.slice(0, 3).forEach(f => {
    console.log(`   - ${f.symbol}: APY ${f.apy.toFixed(2)}% (${f.apyReward?.toFixed(2)}% rewards)`);
  });
  console.log();

  // 4. 测试高收益池子
  console.log('4. Fetching top yields...');
  const topYields = await pancakeswap.getTopYields(100000, 5);
  topYields.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.symbol} (${p.chain}): ${p.apy.toFixed(2)}% APY`);
  });

  console.log('\n✅ All tests passed!');
}

testPancakeSwap().catch(console.error);
```

#### 4.2 添加测试命令

**文件**: `package.json`

```json
{
  "scripts": {
    "test:pancakeswap": "tsx scripts/test-pancakeswap.ts"
  }
}
```

---

## API 示例

### 1. 获取协议概览

```bash
GET /api/defi/pancakeswap/overview
```

**响应**：
```json
{
  "name": "PancakeSwap AMM",
  "tvl": 1234567890,
  "chains": ["BSC", "Ethereum", "Arbitrum"],
  "chainTvls": {
    "BSC": 800000000,
    "Ethereum": 300000000,
    "Arbitrum": 134567890
  },
  "category": "Dexes",
  "logo": "https://...",
  "url": "https://pancakeswap.finance",
  "change_1d": 2.5,
  "change_7d": 5.3
}
```

### 2. 获取池子列表

```bash
GET /api/defi/pancakeswap/pools?chain=bsc&minTvl=100000&limit=20
```

**响应**：
```json
{
  "pools": [
    {
      "pool": "0x...",
      "chain": "BSC",
      "project": "pancakeswap",
      "symbol": "CAKE-BNB",
      "tvlUsd": 50000000,
      "apy": 25.5,
      "apyBase": 5.5,
      "apyReward": 20.0,
      "rewardTokens": ["0x..."],
      "underlyingTokens": ["0x...", "0x..."],
      "poolMeta": "V3",
      "url": "https://pancakeswap.finance/pools/..."
    }
  ],
  "cached": false
}
```

### 3. 获取 Farm 数据

```bash
GET /api/defi/pancakeswap/farms?chain=bsc
```

**响应**：
```json
{
  "farms": [
    {
      "pool": "0x...",
      "chain": "BSC",
      "symbol": "CAKE-BNB LP",
      "tvlUsd": 30000000,
      "apy": 35.5,
      "apyBase": 8.5,
      "apyReward": 27.0,
      "farmType": "LP",
      "rewardApy": 27.0,
      "rewardTokens": ["0x..."]
    }
  ]
}
```

---

## 前端组件

### 组件层次结构

```
app/defi/page.tsx
├── PancakeSwapCard (协议概览)
├── PancakeSwapPools (池子列表)
│   └── YieldCard (单个池子卡片) - 复用现有组件
└── PancakeSwapFarms (Farm 列表)
    └── FarmCard (单个 Farm 卡片)
```

### 复用现有组件

- ✅ `YieldCard`: 展示收益率池子
- ✅ `ProtocolCard`: 展示协议信息
- ✅ `MiniTrendChart`: 展示 APY 趋势
- ✅ `RiskBadge`: 展示风险等级

---

## 数据缓存策略

### 缓存层级

| 数据类型 | 缓存位置 | 缓存时长 | 更新策略 |
|---------|---------|---------|---------|
| 协议概览 | Supabase | 15分钟 | 时间过期 |
| 池子列表 | Supabase | 5分钟 | 时间过期 |
| Farm 数据 | Supabase | 10分钟 | 时间过期 |
| 代币价格 | Supabase | 5分钟 | 时间过期 |

### 缓存优化

1. **预热缓存**：服务器启动时预加载热门数据
2. **后台更新**：缓存过期后异步更新，先返回旧数据
3. **批量更新**：定时任务批量更新所有池子数据
4. **CDN 缓存**：静态资源（logo等）使用 CDN

---

## 测试计划

### 单元测试
- [ ] PancakeSwap 客户端方法
- [ ] 数据类型验证
- [ ] API 端点响应格式

### 集成测试
- [ ] DefiLlama API 调用
- [ ] Supabase 缓存读写
- [ ] API Routes 完整流程

### 端到端测试
- [ ] 页面加载性能
- [ ] 数据刷新流程
- [ ] 错误处理和降级

### 性能测试
- [ ] API 响应时间 < 500ms
- [ ] 首屏加载 < 2s
- [ ] 缓存命中率 > 80%

---

## 里程碑

### Week 1: 基础设施
- [x] 研究 PancakeSwap 架构和 API
- [ ] 创建数据库表和类型定义
- [ ] 实现 PancakeSwap 客户端
- [ ] 创建 API Routes

### Week 2: 前端开发
- [ ] 实现协议卡片组件
- [ ] 实现池子列表组件
- [ ] 集成到 DeFi 页面
- [ ] 样式优化和响应式设计

### Week 3: 测试和优化
- [ ] 编写测试用例
- [ ] 性能优化
- [ ] 文档完善
- [ ] 部署到生产环境

---

## 附录

### 相关链接

- **PancakeSwap 官方文档**: https://docs.pancakeswap.finance
- **开发者文档**: https://developer.pancakeswap.finance
- **Subgraph Repo**: https://github.com/pancakeswap/pancake-subgraph
- **Info API Repo**: https://github.com/pancakeswap/pancake-info-api
- **DefiLlama API**: https://defillama.com/docs/api

### 技术支持

- DefiLlama Discord: https://discord.gg/defillama
- PancakeSwap Discord: https://discord.gg/pancakeswap
- The Graph Discord: https://discord.gg/graphprotocol

---

## 总结

本集成方案采用**混合策略**，以 DefiLlama API 作为主要数据源，配合 Supabase 缓存优化性能。通过复用现有的 DeFi 组件，可以快速集成 PancakeSwap 的池子和协议数据，为用户提供高质量的 DeFi 发现体验。

预计开发时间：**1-2 周**
技术难度：**中等**
维护成本：**低**（主要依赖 DefiLlama，数据稳定可靠）
