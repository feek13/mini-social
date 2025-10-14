# DeFi 收益率机会（Yield Opportunities）完整设计方案

## 📋 目录
1. [设计目标](#设计目标)
2. [行业最佳实践研究](#行业最佳实践研究)
3. [技术架构](#技术架构)
4. [UI/UX 设计](#uiux-设计)
5. [数据源与 API 集成](#数据源与-api-集成)
6. [功能特性](#功能特性)
7. [实施路线图](#实施路线图)

---

## 🎯 设计目标

### 核心价值主张
为用户提供一个**全面、直观、专业**的 DeFi 收益率发现和对比平台，帮助用户：
- 快速发现高收益机会
- 理解风险与收益的平衡
- 对比不同协议的收益表现
- 追踪历史数据趋势

### 目标用户
- **新手投资者**：需要清晰的风险提示和简单的操作流程
- **经验丰富的 DeFi 用户**：需要详细数据、历史趋势和高级筛选
- **社交用户**：可以在动态中分享收益机会

---

## 🔬 行业最佳实践研究

### 1. DeFiLlama Yields (defillama.com/yields)
**优点**：
- ✅ **表格视图为主**：一屏显示更多数据，方便对比
- ✅ **强大的筛选器**：Tokens、Chains、Projects、Category、Attributes、TVL Range、APY
- ✅ **列排序功能**：点击列头即可排序（TVL、APY、Base APY、Reward APY、30d Avg APY）
- ✅ **30d Avg APY**：显示30天平均APY，更可靠的参考值
- ✅ **保存筛选条件**：用户可以保存常用的筛选组合
- ✅ **CSV 导出**：支持数据导出
- ✅ **Mini Chart**：每行显示30天APY趋势小图

**数据规模**：15,375 pools / 502 protocols / 114 chains

### 2. Beefy Finance (app.beefy.com)
**优点**：
- ✅ **快捷筛选按钮**：顶部一排 Toggle 按钮（All, Saved, My Positions, Boosts, Stablecoins, Blue Chips, Memes, Correlated, Single, LP, CLM）
- ✅ **视觉化标签**：BOOST、POINTS、CLM POOL 等特殊标签
- ✅ **多维度展示**：Wallet、Deposited、Current APY、Daily Yield、TVL、Safety
- ✅ **卡片视图**：信息密度高但不拥挤
- ✅ **链图标**：每个池子显示所在链的图标

**特色功能**：
- Portfolio 面板：显示用户的总存款、月收益、日收益、平均APY
- Platform 面板：显示平台总TVL和Vault数量

### 3. Yearn Finance (yearn.fi/vaults)
**优点**：
- ✅ **Est. APY vs Hist. APY**：预估APY和历史APY对比
- ✅ **BOOST 标记**：显示收益增强倍数（如 BOOST 2.25x）
- ✅ **⚡️ 高亮标记**：特别高的APY用闪电图标标识
- ✅ **简洁表格**：列设计简洁，重点突出
- ✅ **分页导航**：底部显示页码和总结果数

**特色**：
- 专注于 Curve Finance 生态
- 显示 Available（可用金额）和 Holdings（持有）

---

## 🏗️ 技术架构

### 前端技术栈

```typescript
// 核心库
- Next.js 15 (App Router) - 框架
- TypeScript - 类型安全
- Tailwind CSS v4 - 样式

// UI 组件
- shadcn/ui - 基础组件库（Button, Dialog, Select, Badge等）
- TanStack Table v8 - 表格组件（支持排序、筛选、分页）
- Recharts - 图表库（已使用，继续用于趋势图）
- lucide-react - 图标库（已使用）

// 状态管理
- React Context - 筛选条件状态
- TanStack Query (可选) - 服务端状态管理和缓存
```

### 后端 & 数据

```typescript
// API 路由
- /api/defi/yields - DeFiLlama yields API
- /api/defi/yields/[poolId] - 单个池子详情
- /api/defi/yields/history/[poolId] - 历史数据
- /api/defi/yields/compare - 对比多个池子
- /api/defi/dex/pairs - DexScreener 交易对搜索（新增）
- /api/defi/dex/trending - DexScreener 热门代币（新增）

// 数据缓存（Supabase）
- defi_yields 表（已存在）
- defi_yield_history 表（新增，存储历史数据）
- user_yield_favorites 表（新增，用户收藏的池子）
- dex_pairs_cache 表（新增，DexScreener 数据缓存）

// 外部 API（优先级排序）
- DeFiLlama Yields API (主要 - 协议收益率)
- DexScreener API (实时 DEX 数据) 🆕
- De.Fi API (补充 - 风险评分)
- CoinGecko API (代币价格和图标补充)
```

---

## 🎨 UI/UX 设计

### 页面布局

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Yield Opportunities                        [视图切换]    │
├─────────────────────────────────────────────────────────────┤
│  💰 平台总览                                                 │
│  Total TVL: $8.5B  |  Pools: 15,375  |  Avg APY: 12.5%    │
├─────────────────────────────────────────────────────────────┤
│  🔍 快捷筛选                                                 │
│  [All] [Stablecoins] [Single Asset] [Low IL] [High TVL]    │
│  [High APY 50%+] [Ethereum] [BSC] [Polygon]                │
├─────────────────────────────────────────────────────────────┤
│  🔧 高级筛选                                                 │
│  Chain: [All ▼]  TVL: [$10M+ ▼]  APY: [All ▼]  Sort: [▼]  │
│  🔍 Search: [ETH-USDC, Aave, Uniswap...]                   │
├─────────────────────────────────────────────────────────────┤
│  📊 收益率池子列表（表格视图 / 卡片视图）                    │
│                                                             │
│  [表格视图示例]                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Pool          Chain   TVL     APY    30d   Risk  📊 │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ ⭐ ETH-USDC   Ethereum $125M  8.5%   7.8%  🟢   ↗️  │  │
│  │ 💎 AAVE       Polygon  $45M   12.3%  11.5% 🔴   →   │  │
│  │ ...                                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  [分页] Showing 1-20 of 15,375     [1][2][3]...[769] →    │
└─────────────────────────────────────────────────────────────┘
```

### 1. 顶部统计面板（Platform Overview）

```tsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
  <StatCard
    icon={<DollarSign />}
    label="Total TVL"
    value="$8.5B"
    change="+2.3%"
  />
  <StatCard
    icon={<Layers />}
    label="Active Pools"
    value="15,375"
    subtitle="502 protocols"
  />
  <StatCard
    icon={<TrendingUp />}
    label="Avg APY"
    value="12.5%"
    change="+0.8%"
  />
  <StatCard
    icon={<Shield />}
    label="Lowest Risk"
    value="8 pools"
    subtitle="TVL $10M+"
  />
</div>
```

### 2. 快捷筛选按钮（Quick Filters）

```tsx
// 设计要点：
// - Toggle 按钮样式，可多选
// - 选中状态：蓝色背景、白色文字
// - 未选中：灰色边框、灰色文字
// - Hover 效果：边框变蓝

<div className="flex flex-wrap gap-2 mb-4">
  <FilterButton active={filters.all} onClick={() => toggleFilter('all')}>
    All
  </FilterButton>
  <FilterButton active={filters.stablecoins} onClick={() => toggleFilter('stablecoins')}>
    💵 Stablecoins
  </FilterButton>
  <FilterButton active={filters.singleAsset} onClick={() => toggleFilter('singleAsset')}>
    💎 Single Asset
  </FilterButton>
  <FilterButton active={filters.lowIL} onClick={() => toggleFilter('lowIL')}>
    🟢 Low IL Risk
  </FilterButton>
  <FilterButton active={filters.highTVL} onClick={() => toggleFilter('highTVL')}>
    🏦 High TVL ($10M+)
  </FilterButton>
  <FilterButton active={filters.highAPY} onClick={() => toggleFilter('highAPY')}>
    🚀 High APY (50%+)
  </FilterButton>
</div>
```

### 3. 高级筛选器（Advanced Filters）

```tsx
<div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
  {/* Chain 筛选 */}
  <Select value={chain} onValueChange={setChain}>
    <SelectTrigger>
      <SelectValue placeholder="Chain: All" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Chains</SelectItem>
      <SelectItem value="ethereum">Ethereum</SelectItem>
      <SelectItem value="bsc">BSC</SelectItem>
      <SelectItem value="polygon">Polygon</SelectItem>
      {/* ... */}
    </SelectContent>
  </Select>

  {/* TVL 筛选 */}
  <Select value={tvlRange} onValueChange={setTvlRange}>
    <SelectTrigger>
      <SelectValue placeholder="TVL: All" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All</SelectItem>
      <SelectItem value="1m-10m">$1M - $10M</SelectItem>
      <SelectItem value="10m-100m">$10M - $100M</SelectItem>
      <SelectItem value="100m+">$100M+ 🏆</SelectItem>
    </SelectContent>
  </Select>

  {/* APY 筛选 */}
  <Select value={apyRange} onValueChange={setApyRange}>
    <SelectTrigger>
      <SelectValue placeholder="APY: All" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All</SelectItem>
      <SelectItem value="0-10">0% - 10%</SelectItem>
      <SelectItem value="10-50">10% - 50%</SelectItem>
      <SelectItem value="50+">50%+ 🚀</SelectItem>
    </SelectContent>
  </Select>

  {/* 排序 */}
  <Select value={sortBy} onValueChange={setSortBy}>
    <SelectTrigger>
      <SelectValue placeholder="Sort by" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="apy-desc">APY (High to Low)</SelectItem>
      <SelectItem value="apy-asc">APY (Low to High)</SelectItem>
      <SelectItem value="tvl-desc">TVL (High to Low)</SelectItem>
      <SelectItem value="30d-apy-desc">30d Avg APY ⭐</SelectItem>
    </SelectContent>
  </Select>

  {/* 搜索框 */}
  <div className="relative">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
    <Input
      placeholder="Search pools..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="pl-10"
    />
  </div>
</div>
```

### 4. 表格视图（TanStack Table）

```tsx
// 使用 TanStack Table v8

const columns = [
  // 收藏按钮
  {
    id: 'favorite',
    header: '',
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" onClick={() => toggleFavorite(row.original.pool)}>
        <Star className={isFavorite(row.original.pool) ? 'fill-yellow-500 text-yellow-500' : ''} />
      </Button>
    ),
  },

  // 池子名称
  {
    accessorKey: 'symbol',
    header: 'Pool',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {/* 代币图标 */}
          <img src={row.original.token0Icon} className="w-6 h-6 rounded-full border-2 border-white" />
          <img src={row.original.token1Icon} className="w-6 h-6 rounded-full border-2 border-white" />
        </div>
        <div>
          <div className="font-bold">{row.original.symbol}</div>
          <div className="text-xs text-gray-500">{row.original.project}</div>
        </div>
        {/* 特性标签 */}
        {row.original.stablecoin && (
          <Badge variant="secondary">💵 Stable</Badge>
        )}
      </div>
    ),
  },

  // 链
  {
    accessorKey: 'chain',
    header: 'Chain',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <img src={getChainIcon(row.original.chain)} className="w-5 h-5" />
        <span className="text-sm">{row.original.chain}</span>
      </div>
    ),
  },

  // TVL
  {
    accessorKey: 'tvlUsd',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting()}>
        TVL
        {column.getIsSorted() === 'asc' ? <ChevronUp /> : <ChevronDown />}
      </Button>
    ),
    cell: ({ row }) => <div className="font-semibold">{formatTVL(row.original.tvlUsd)}</div>,
  },

  // APY（重点列）
  {
    accessorKey: 'apy',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting()}>
        APY
        {column.getIsSorted() === 'asc' ? <ChevronUp /> : <ChevronDown />}
      </Button>
    ),
    cell: ({ row }) => (
      <div>
        <div className={`text-lg font-bold ${isHighAPY(row.original.apy) ? 'text-green-600' : 'text-gray-900'}`}>
          {formatAPY(row.original.apy)}
        </div>
        <div className="text-xs text-gray-500">
          Base: {formatAPY(row.original.apyBase)}
          {row.original.apyReward > 0 && ` + Reward: ${formatAPY(row.original.apyReward)}`}
        </div>
      </div>
    ),
  },

  // 30天平均 APY
  {
    accessorKey: 'apyMean30d',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting()}>
        30d Avg ⭐
        {column.getIsSorted() === 'asc' ? <ChevronUp /> : <ChevronDown />}
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-sm font-semibold text-blue-600">
        {formatAPY(row.original.apyMean30d)}
      </div>
    ),
  },

  // 风险等级
  {
    accessorKey: 'ilRisk',
    header: 'IL Risk',
    cell: ({ row }) => {
      const risk = getRiskStyle(row.original.ilRisk)
      return (
        <Badge className={`${risk.bg} ${risk.color}`}>
          {risk.label}
        </Badge>
      )
    },
  },

  // 趋势图
  {
    id: 'trend',
    header: '30d Trend',
    cell: ({ row }) => (
      <MiniTrendChart data={row.original.apyHistory} />
    ),
  },

  // 操作
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => viewDetails(row.original)}>
          Details
        </Button>
        <Button size="sm" onClick={() => invest(row.original)}>
          Invest →
        </Button>
      </div>
    ),
  },
]
```

### 5. 卡片视图（优化版 YieldCard）

```tsx
// 改进要点：
// 1. 币对名称放在最上方，大字号
// 2. 30d Avg APY 显示在 APY 旁边
// 3. 减少视觉干扰，更简洁

<Card className="hover:shadow-lg transition-shadow">
  {/* 顶部：池子信息 */}
  <CardHeader>
    <div className="flex justify-between items-start">
      <div className="flex items-center gap-3">
        {/* 代币图标 */}
        <div className="flex -space-x-3">
          <img src={token0Icon} className="w-10 h-10 rounded-full border-2 border-white" />
          <img src={token1Icon} className="w-10 h-10 rounded-full border-2 border-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold">{symbol}</h3>
          <p className="text-sm text-gray-500">{project}</p>
        </div>
      </div>

      {/* 收藏按钮 */}
      <Button variant="ghost" size="icon">
        <Star className={isFavorite ? 'fill-yellow-500' : ''} />
      </Button>
    </div>

    {/* 标签 */}
    <div className="flex flex-wrap gap-2 mt-3">
      <Badge variant="outline">
        <img src={chainIcon} className="w-4 h-4 mr-1" />
        {chain}
      </Badge>
      {stablecoin && <Badge>💵 Stablecoin</Badge>}
      {exposure === 'single' && <Badge>💎 Single</Badge>}
      <Badge className={riskBadgeStyle}>{riskLabel}</Badge>
    </div>
  </CardHeader>

  {/* 中间：APY 数据（重点） */}
  <CardContent>
    <div className="grid grid-cols-2 gap-4 mb-4">
      {/* 当前 APY */}
      <div>
        <div className="text-xs text-gray-500 mb-1">Current APY</div>
        <div className={`text-3xl font-black ${isHighAPY ? 'text-green-600' : 'text-gray-900'}`}>
          {formatAPY(apy)}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {apyBase > 0 && `Base: ${formatAPY(apyBase)}`}
          {apyReward > 0 && ` + ${formatAPY(apyReward)}`}
        </div>
      </div>

      {/* 30天平均 APY */}
      <div>
        <div className="text-xs text-gray-500 mb-1">30d Avg APY ⭐</div>
        <div className="text-3xl font-bold text-blue-600">
          {formatAPY(apyMean30d)}
        </div>
        {apyPct7D !== null && (
          <div className={`text-xs ${getAPYTrendColor(apyPct7D)} mt-1`}>
            7d: {formatAPYChange(apyPct7D)}
          </div>
        )}
      </div>
    </div>

    {/* TVL 和趋势图 */}
    <div className="border-t pt-4">
      <div className="flex justify-between items-center mb-2">
        <div className="text-xs text-gray-500">Total Value Locked</div>
        <div className="text-lg font-bold">{formatTVL(tvlUsd)}</div>
      </div>

      {/* 30天趋势图 */}
      <div className="h-16 mt-2">
        <MiniTrendChart data={apyHistory} />
      </div>
    </div>
  </CardContent>

  {/* 底部：操作按钮 */}
  <CardFooter className="flex gap-2">
    <Button variant="outline" className="flex-1" onClick={() => viewDetails()}>
      <Info className="w-4 h-4 mr-2" />
      Details
    </Button>
    <Button className="flex-1" onClick={() => invest()}>
      <ExternalLink className="w-4 h-4 mr-2" />
      Invest
    </Button>
  </CardFooter>
</Card>
```

### 6. 池子详情页（Pool Detail Modal/Page）

```
┌───────────────────────────────────────────────────────────┐
│  ETH-USDC Liquidity Pool                         [X]      │
│  Uniswap V3 · Ethereum                                    │
├───────────────────────────────────────────────────────────┤
│  📊 Performance Overview                                  │
│  ┌─────────────┬─────────────┬─────────────┬───────────┐ │
│  │ Current APY │ 30d Avg APY │   TVL       │ IL Risk   │ │
│  │   8.5%      │   7.8%      │  $125M      │ 🟢 Low    │ │
│  └─────────────┴─────────────┴─────────────┴───────────┘ │
├───────────────────────────────────────────────────────────┤
│  📈 APY History (90 days)                                 │
│  [Line Chart]                                             │
├───────────────────────────────────────────────────────────┤
│  💰 APY Breakdown                                         │
│  - Base APY: 2.1% (Trading Fees)                         │
│  - Reward APY: 6.4% (UNI Tokens)                         │
├───────────────────────────────────────────────────────────┤
│  ⚠️ Risk Analysis                                         │
│  - Impermanent Loss: Low (Stablecoin pair)               │
│  - Smart Contract: Audited by Trail of Bits              │
│  - Liquidity: High ($125M)                               │
├───────────────────────────────────────────────────────────┤
│  🔗 Quick Actions                                         │
│  [Invest on Uniswap →]  [Add to Watchlist]  [Share]     │
└───────────────────────────────────────────────────────────┘
```

---

## 🔌 数据源与 API 集成

### 数据源策略

我们采用**多数据源组合**策略，每个 API 各司其职：

| 数据源 | 用途 | 优势 | 限制 |
|--------|------|------|------|
| **DeFiLlama** | 协议收益率、TVL、历史 APY | 数据最全、覆盖 500+ 协议 | 更新频率较低（小时级） |
| **DexScreener** 🆕 | 实时 DEX 价格、流动性、成交量 | 实时数据、交易对搜索 | 仅 DEX 数据、无 APY |
| **De.Fi** | 智能合约风险评分 | 安全性分析、审计状态 | 60 req/min |
| **CoinGecko** | 代币图标、补充价格 | 图标资源丰富 | 免费额度有限 |

### 主要数据源

#### 1. DeFiLlama Yields API（主力 - 协议收益率）
```typescript
// 已有集成，继续使用
const yields = await defillama.getYields()

// 新增：获取单个池子的历史数据
async function getPoolHistory(poolId: string) {
  const response = await fetch(`https://yields.llama.fi/chart/${poolId}`)
  return response.json()
}
```

**优势**：
- ✅ 直接提供 APY 数据（Base + Reward）
- ✅ 30天平均 APY
- ✅ 覆盖 Lending、Staking、Yield Aggregators 等
- ✅ TVL 数据准确

**劣势**：
- ⚠️ 更新频率较低（小时级）
- ⚠️ DEX 池子覆盖不全

#### 2. DexScreener API（新增 - 实时 DEX 数据）🆕
```typescript
import { dexscreener } from '@/lib/dexscreener'

// 1. 搜索交易对
const pairs = await dexscreener.searchPairs('ETH USDC')

// 2. 获取代币的所有交易对
const tokenPairs = await dexscreener.getTokenPairs('ethereum', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')

// 3. 获取实时流动性和成交量
const pairDetails = await dexscreener.getPairDetails('ethereum', '0x...')
console.log(`Liquidity: $${pairDetails[0].liquidity?.usd}`)
console.log(`24h Volume: $${pairDetails[0].volume.h24}`)

// 4. 估算 APY（基于交易费用）
const estimatedAPY = dexscreener.calculateEstimatedAPY(pairDetails[0])

// 5. 获取热门/推广的代币
const boosted = await dexscreener.getLatestBoostedTokens()
const trending = await dexscreener.getTrendingPairs('ethereum', 10)
```

**优势**：
- ✅ **实时数据**：价格、流动性、成交量实时更新
- ✅ **DEX 专注**：Uniswap、SushiSwap、PancakeSwap 等所有 DEX
- ✅ **交易对搜索**：强大的搜索功能
- ✅ **Trending & Boosted**：发现热门代币
- ✅ **免费无限制**：300 requests/min，无需 API Key

**劣势**：
- ⚠️ 无 APY 数据（需要自己估算）
- ⚠️ 不包括 Lending、Staking 协议

**适用场景**：
1. **DEX 流动性池子**：Uniswap V2/V3、SushiSwap、PancakeSwap
2. **实时价格监控**：追踪代币价格变化
3. **新代币发现**：Trending 和 Boosted tokens
4. **流动性挖矿对比**：对比不同 DEX 的同一交易对

### 数据源组合策略

#### 策略 1: DeFiLlama + DexScreener（推荐）

**组合收益率数据**，提供最全面的信息：

```typescript
// 1. 从 DeFiLlama 获取协议收益率
const defiLlamaYields = await defillama.getTopYields(50, 1000000)

// 2. 从 DexScreener 获取 DEX 交易对（补充 DeFiLlama 未覆盖的）
const dexPairs = await dexscreener.searchPairs('WETH USDC')
const dexYields = dexPairs.map(pair => ({
  pool: pair.pairAddress,
  symbol: `${pair.baseToken.symbol}-${pair.quoteToken.symbol}`,
  project: pair.dexId,
  chain: pair.chainId,
  tvlUsd: pair.liquidity?.usd || 0,
  apy: dexscreener.calculateEstimatedAPY(pair),  // 估算 APY
  apyBase: dexscreener.calculateEstimatedAPY(pair),
  apyReward: 0,
  ilRisk: 'yes',
  stablecoin: false,
  exposure: 'multi',
  // DexScreener 特有数据
  priceUsd: pair.priceUsd,
  volume24h: pair.volume.h24,
  priceChange24h: pair.priceChange.h24,
  txns24h: pair.txns.h24.buys + pair.txns.h24.sells,
  dexId: pair.dexId,
}))

// 3. 合并数据
const allYields = [...defiLlamaYields, ...dexYields]

// 4. 去重（同一个池子可能在两个数据源都有）
const uniqueYields = deduplicateYields(allYields)

// 5. 排序和筛选
const sorted = uniqueYields.sort((a, b) => b.apy - a.apy)
```

**收益**：
- ✅ 覆盖更多池子（DeFiLlama 500+ 协议 + DexScreener 所有 DEX）
- ✅ 实时流动性数据（来自 DexScreener）
- ✅ 准确的 APY（来自 DeFiLlama）
- ✅ 价格变化趋势（来自 DexScreener）

#### 策略 2: 实时流动性 + 历史 APY

为 DeFiLlama 的池子补充实时数据：

```typescript
// 1. 从 DeFiLlama 获取池子（带历史 APY）
const pool = await defillama.getProtocol('uniswap-v3')

// 2. 提取池子的交易对地址
const pairAddress = extractPairAddress(pool)

// 3. 从 DexScreener 获取实时数据
const realtimeData = await dexscreener.getPairDetails('ethereum', pairAddress)

// 4. 合并数据
const enrichedPool = {
  ...pool,
  // DeFiLlama 的 APY（更准确）
  apy: pool.apy,
  apyMean30d: pool.apyMean30d,

  // DexScreener 的实时数据
  tvlUsd: realtimeData[0].liquidity?.usd,  // 实时流动性
  volume24h: realtimeData[0].volume.h24,   // 实时成交量
  priceChange24h: realtimeData[0].priceChange.h24,  // 价格变化
  txns24h: realtimeData[0].txns.h24.buys + realtimeData[0].txns.h24.sells,
}
```

**收益**：
- ✅ APY 数据准确（DeFiLlama）
- ✅ TVL 实时更新（DexScreener）
- ✅ 成交量和交易笔数（DexScreener）

#### 3. De.Fi API（补充：风险评分）
```typescript
// 新增集成
const DEFI_API_URL = 'https://api.de.fi/v1'

async function getDefiRiskScore(protocolAddress: string, chain: string) {
  const response = await fetch(`${DEFI_API_URL}/scanner/${chain}/${protocolAddress}`)
  return response.json()
  // 返回：{ riskScore: 85, vulnerabilities: [], auditStatus: 'verified' }
}
```

#### 3. CoinGecko API（补充：代币价格和图标）
```typescript
// 已有 DeFiLlama 的价格 API，CoinGecko 主要用于获取图标
async function getTokenIcon(address: string, chain: string) {
  const response = await fetch(
    `https://api.coingecko.com/api/v3/coins/${chain}/contract/${address}`
  )
  const data = await response.json()
  return data.image.small
}
```

### 数据缓存策略

```sql
-- defi_yield_history 表（新增）
CREATE TABLE defi_yield_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pool_id TEXT NOT NULL,
  date DATE NOT NULL,
  apy DECIMAL(10, 2),
  apy_base DECIMAL(10, 2),
  apy_reward DECIMAL(10, 2),
  tvl_usd BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pool_id, date)
);

-- 索引
CREATE INDEX idx_yield_history_pool_date ON defi_yield_history(pool_id, date DESC);

-- user_yield_favorites 表（新增）
CREATE TABLE user_yield_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  pool_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pool_id)
);

-- 索引
CREATE INDEX idx_yield_favorites_user ON user_yield_favorites(user_id);
```

### API 路由设计

```typescript
// /app/api/defi/yields/route.ts（已存在，优化）
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const chain = searchParams.get('chain')
  const minTvl = searchParams.get('minTvl')
  const minApy = searchParams.get('minApy')
  const maxApy = searchParams.get('maxApy')
  const stablecoin = searchParams.get('stablecoin') === 'true'
  const singleAsset = searchParams.get('singleAsset') === 'true'
  const sortBy = searchParams.get('sortBy') || 'apy'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  // 从缓存或 DeFiLlama 获取数据
  let yields = await getCachedYields()

  // 筛选
  yields = yields.filter(pool => {
    if (chain && pool.chain !== chain) return false
    if (minTvl && pool.tvlUsd < parseInt(minTvl)) return false
    if (minApy && pool.apy < parseFloat(minApy)) return false
    if (maxApy && pool.apy > parseFloat(maxApy)) return false
    if (stablecoin && !pool.stablecoin) return false
    if (singleAsset && pool.exposure !== 'single') return false
    return true
  })

  // 排序
  yields = sortYields(yields, sortBy)

  // 分页
  const start = (page - 1) * limit
  const paginatedYields = yields.slice(start, start + limit)

  return NextResponse.json({
    data: paginatedYields,
    total: yields.length,
    page,
    limit,
  })
}

// /app/api/defi/yields/[poolId]/route.ts（新增）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const { poolId } = await params

  // 获取池子详情
  const pool = await getPoolDetails(poolId)

  // 获取历史数据
  const history = await getPoolHistory(poolId)

  // 获取风险评分（De.Fi API）
  const riskScore = await getDefiRiskScore(pool.address, pool.chain)

  return NextResponse.json({
    ...pool,
    history,
    riskScore,
  })
}

// /app/api/defi/yields/favorites/route.ts（新增）
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const supabase = getSupabaseClientWithAuth(authHeader)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 获取用户收藏的池子
  const { data: favorites } = await supabase
    .from('user_yield_favorites')
    .select('pool_id')
    .eq('user_id', user.id)

  const poolIds = favorites?.map(f => f.pool_id) || []

  // 获取池子详情
  const pools = await getPoolsByIds(poolIds)

  return NextResponse.json({ data: pools })
}

export async function POST(request: Request) {
  // 添加收藏
}

export async function DELETE(request: Request) {
  // 取消收藏
}
```

---

## 🎁 功能特性

### 核心功能（P0 - 必须实现）

#### 1. 多维度筛选
- ✅ **快捷筛选按钮**：Stablecoins, Single Asset, Low IL, High TVL ($10M+), High APY (50%+)
- ✅ **高级筛选器**：Chain, TVL Range, APY Range, Sort By
- ✅ **搜索功能**：支持币对名称、协议名称搜索

#### 2. 表格视图（默认）
- ✅ 使用 **TanStack Table v8**
- ✅ **列排序**：点击列头排序（APY, TVL, 30d Avg APY）
- ✅ **列显示**：Pool, Chain, TVL, APY, Base APY, Reward APY, 30d Avg APY, IL Risk, 30d Trend
- ✅ **分页**：每页20条，支持跳页

#### 3. 卡片视图（可切换）
- ✅ 优化后的 **YieldCard** 组件
- ✅ 币对名称大字号显示
- ✅ 30d Avg APY 对比当前 APY
- ✅ Mini 趋势图

#### 4. 数据可视化
- ✅ **Mini Trend Chart**：30天 APY 趋势小图（表格每行、卡片底部）
- ✅ **Sparkline 库**：使用 Recharts 或 Victory-Native

#### 5. 收藏功能
- ✅ 用户可以收藏感兴趣的池子
- ✅ 快速访问收藏列表
- ✅ 在动态中分享收藏的池子

### 增强功能（P1 - 应该实现）

#### 6. 池子详情页
- ✅ APY 历史图表（90天）
- ✅ APY 分解说明（Base APY 来源、Reward 代币）
- ✅ 风险分析（IL 风险、智能合约审计、流动性）
- ✅ 快速操作（跳转到协议官网、加入对比、分享）

#### 7. 对比功能（优化现有）
- ✅ 在列表中"加入对比"
- ✅ 底部悬浮栏显示已选池子
- ✅ 对比页面显示详细数据对比

#### 8. 风险评分（集成 De.Fi）
- ✅ 显示智能合约风险评分
- ✅ 审计状态
- ✅ 已知漏洞

#### 9. 保存筛选条件
- ✅ 用户可以保存常用的筛选组合
- ✅ 快速切换到已保存的筛选

### 高级功能（P2 - 锦上添花）

#### 10. 个人投资组合追踪
- ✅ 用户输入持仓
- ✅ 自动计算收益
- ✅ 显示 Portfolio 面板（总存款、月收益、日收益）

#### 11. 通知和提醒
- ✅ APY 大幅变化时通知用户
- ✅ 收藏的池子有新机会时提醒

#### 12. AI 推荐
- ✅ 根据用户风险偏好推荐池子
- ✅ "Similar Pools" 推荐

#### 13. 社交功能集成
- ✅ 在动态中嵌入 Yield Opportunity（已有 DeFiEmbedPicker）
- ✅ 分享池子到动态
- ✅ 评论区讨论收益机会

---

## 🗺️ 实施路线图

### 第一阶段（核心功能）- 2周

#### Week 1: 数据层和基础 UI
- [ ] Day 1-2: 数据库迁移（添加 `defi_yield_history` 和 `user_yield_favorites` 表）
- [ ] Day 3-4: API 路由优化（筛选、排序、分页）
- [ ] Day 5-7: 快捷筛选 UI + 高级筛选器组件

#### Week 2: 表格视图和卡片视图
- [ ] Day 8-10: TanStack Table 集成，实现表格视图
- [ ] Day 11-12: 优化 YieldCard 组件
- [ ] Day 13-14: 视图切换、收藏功能

### 第二阶段（增强功能）- 1.5周

#### Week 3: 详情页和对比功能
- [ ] Day 15-16: 池子详情页（Modal 或独立页面）
- [ ] Day 17-18: APY 历史图表（Recharts）
- [ ] Day 19-20: 优化对比功能

#### Week 4: 风险评分和数据补充
- [ ] Day 21-22: 集成 De.Fi API（风险评分）
- [ ] Day 23: Mini Trend Chart 组件
- [ ] Day 24: 保存筛选条件功能

### 第三阶段（高级功能）- 1周（可选）

#### Week 5: 个人投资组合和通知
- [ ] Day 25-26: 个人投资组合追踪
- [ ] Day 27-28: 通知和提醒功能
- [ ] Day 29-30: AI 推荐（基于规则或简单算法）

---

## 📐 设计规范

### 颜色系统

```typescript
// APY 颜色
const apyColors = {
  low: 'text-gray-900',      // < 5%
  medium: 'text-blue-600',   // 5% - 20%
  high: 'text-green-600',    // 20% - 50%
  veryHigh: 'text-orange-600' // > 50%
}

// 风险颜色
const riskColors = {
  none: { bg: 'bg-blue-100', color: 'text-blue-700', label: 'No IL' },
  low: { bg: 'bg-green-100', color: 'text-green-700', label: 'Low Risk' },
  medium: { bg: 'bg-yellow-100', color: 'text-yellow-700', label: 'Medium Risk' },
  high: { bg: 'bg-red-100', color: 'text-red-700', label: 'High Risk' },
}

// 链颜色（可选）
const chainColors = {
  ethereum: '#627EEA',
  bsc: '#F0B90B',
  polygon: '#8247E5',
  arbitrum: '#28A0F0',
  optimism: '#FF0420',
}
```

### 字体大小

```css
/* Pool 名称 */
.pool-name { font-size: 1.125rem; font-weight: 700; } /* 18px, bold */

/* APY 数字（表格） */
.apy-value { font-size: 1.25rem; font-weight: 800; } /* 20px, extrabold */

/* APY 数字（卡片） */
.apy-value-card { font-size: 2rem; font-weight: 900; } /* 32px, black */

/* 30d Avg APY */
.apy-30d { font-size: 0.875rem; font-weight: 600; color: #2563eb; } /* 14px, semibold, blue */
```

### 间距规范

```typescript
// 卡片间距
const cardSpacing = {
  grid: 'gap-4 md:gap-6',
  padding: 'p-4 md:p-6',
  margin: 'mb-4 md:mb-6',
}

// 表格行高
const tableRowHeight = 'h-20' // 80px，足够显示 Mini Chart
```

---

## 🎯 成功指标

### 用户体验指标
- ✅ **页面加载时间** < 2s（首屏）
- ✅ **筛选响应时间** < 100ms（客户端筛选）
- ✅ **表格滚动流畅度** 60 FPS
- ✅ **移动端适配** 完全响应式

### 业务指标
- ✅ **用户留存率** +20%（因为有用的收益工具）
- ✅ **分享率** +30%（在动态中分享收益机会）
- ✅ **点击转化率** > 5%（点击"Invest"按钮）
- ✅ **收藏使用率** > 15%（用户收藏至少1个池子）

---

## 🚀 总结

这是一个**全面、专业、用户友好**的 DeFi 收益率机会功能设计方案，结合了：

1. **行业最佳实践**：DeFiLlama 的强大筛选、Beefy 的快捷操作、Yearn 的数据对比
2. **现代技术栈**：TanStack Table v8、shadcn/ui、Recharts
3. **多数据源**：DeFiLlama（主力）+ De.Fi（风险）+ CoinGecko（图标）
4. **渐进式实施**：分阶段实施，优先核心功能，逐步增强

**核心亮点**：
- 🎨 **双视图**：表格视图（高效对比）+ 卡片视图（视觉丰富）
- 🔍 **智能筛选**：快捷按钮 + 高级筛选器 + 搜索
- 📊 **数据可视化**：30d Avg APY + Mini Trend Chart
- ⭐ **收藏和分享**：用户可以保存感兴趣的池子，分享到社交动态
- 🛡️ **风险透明**：IL 风险标记 + 智能合约审计状态

这个方案可以让你的 DeFi 功能达到专业级水平，同时保持良好的用户体验！
