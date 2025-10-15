# Web3 多服务集成架构方案

## 📋 方案概述

整合 **Alchemy + Covalent + Ankr + CoinGecko** 四个服务，充分利用各自的免费额度和优势，实现高可用、低成本的 Web3 数据查询系统。

---

## 🎯 服务职责划分

### 1. **Alchemy** (主力 - Ethereum 生态)
**免费额度**: 300M Compute Units/月 (约 300 万次请求)

**负责**:
- ✅ Ethereum 主网数据 (余额、NFT、交易)
- ✅ Polygon 数据
- ✅ Arbitrum 数据
- ✅ Optimism 数据
- ✅ Base 数据
- ✅ 高优先级链的查询

**API 功能**:
- `getBalance()` - 钱包余额
- `getTokenBalances()` - ERC20 代币
- `getNFTs()` - NFT 数据
- `getAssetTransfers()` - 交易历史

**使用场景**: 当用户查询 Ethereum 生态链时，优先使用 Alchemy

---

### 2. **Covalent** (多链支持 + 价格数据)
**免费额度**: 100,000 credits/月 (约 10 万次请求)

**负责**:
- ✅ 100+ 条链的数据 (BSC, Avalanche, Fantom, Cronos 等)
- ✅ 历史余额查询
- ✅ 代币价格数据（备用）
- ✅ Alchemy 不支持的链

**API 功能**:
- `GET /v1/{chainId}/address/{address}/balances_v2/` - 钱包余额+价格
- `GET /v1/{chainId}/address/{address}/transactions_v2/` - 交易历史
- `GET /v1/{chainId}/address/{address}/transfers_v2/` - 代币转账

**使用场景**:
- BSC, Avalanche 等非 Ethereum 生态链
- Alchemy 额度不足时的备用方案

---

### 3. **Ankr** (备用数据源 + RPC)
**免费额度**: 公开 RPC 无限制（有速率限制）

**负责**:
- ✅ 作为 Alchemy 和 Covalent 的备用
- ✅ 提供免费多链 RPC 节点
- ✅ 降级场景使用

**API 功能**:
- Advanced API (需要 API key，额度有限)
- Public RPC (完全免费)

**使用场景**:
- 其他服务故障或额度耗尽时
- 简单的链上查询（通过 RPC）

---

### 4. **CoinGecko** (专职价格数据)
**免费额度**: 10-50 请求/分钟

**负责**:
- ✅ 所有代币的价格查询
- ✅ 历史价格数据
- ✅ 市场数据（市值、交易量等）

**API 功能**:
- `GET /simple/token_price/{platform}` - 代币价格
- `GET /simple/price` - 批量价格查询
- `GET /coins/{id}/market_chart` - 历史价格

**使用场景**:
- 所有价格查询优先使用 CoinGecko
- Covalent 价格数据作为备用

---

## 🏗️ 架构设计

```
┌─────────────────────────────────────────────────────┐
│              API Routes (Next.js)                    │
│   /api/wallet/[address]/overview                    │
│   /api/wallet/[address]/tokens                      │
│   /api/wallet/[address]/nfts                        │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│           Web3DataProvider (统一接口)                │
│   - 智能路由                                          │
│   - 故障转移                                          │
│   - 缓存管理                                          │
│   - 限流控制                                          │
└────────────────────┬────────────────────────────────┘
                     │
        ┌────────────┼────────────┬──────────┐
        ▼            ▼            ▼          ▼
    ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
    │Alchemy │  │Covalent│  │  Ankr  │  │CoinGecko│
    │ Client │  │ Client │  │ Client │  │ Client  │
    └────────┘  └────────┘  └────────┘  └────────┘
```

---

## 📂 文件结构

```
lib/web3/
├── client.ts                 # 统一客户端（对外接口）
├── provider.ts               # 数据提供者（智能路由）
├── types.ts                  # 统一类型定义
├── config.ts                 # 链配置和路由规则
├── cache.ts                  # 缓存层（Redis/内存）
│
├── alchemy/
│   ├── client.ts             # Alchemy API 客户端
│   ├── types.ts              # Alchemy 特定类型
│   └── chains.ts             # 支持的链配置
│
├── covalent/
│   ├── client.ts             # Covalent API 客户端
│   ├── types.ts              # Covalent 特定类型
│   └── chains.ts             # 支持的链配置
│
├── ankr/
│   ├── client.ts             # Ankr API 客户端
│   └── rpc.ts                # RPC 客户端
│
├── coingecko/
│   ├── client.ts             # CoinGecko API 客户端
│   ├── types.ts              # 价格数据类型
│   └── platforms.ts          # 平台 ID 映射
│
└── utils/
    ├── retry.ts              # 重试逻辑
    ├── fallback.ts           # 故障转移
    └── ratelimit.ts          # 限流控制
```

---

## 🔄 智能路由策略

### 规则 1: 按链路由

```typescript
const CHAIN_ROUTING = {
  // Ethereum 生态 -> Alchemy 优先
  ethereum: ['alchemy', 'covalent', 'ankr'],
  polygon: ['alchemy', 'covalent', 'ankr'],
  arbitrum: ['alchemy', 'covalent', 'ankr'],
  optimism: ['alchemy', 'covalent', 'ankr'],
  base: ['alchemy', 'covalent', 'ankr'],

  // 其他链 -> Covalent 优先
  bsc: ['covalent', 'ankr'],
  avalanche: ['covalent', 'ankr'],
  fantom: ['covalent', 'ankr'],
  cronos: ['covalent', 'ankr'],
}
```

### 规则 2: 按数据类型路由

```typescript
const DATA_TYPE_ROUTING = {
  // 价格数据 -> CoinGecko 优先
  'token-price': ['coingecko', 'covalent'],

  // 余额数据 -> 按链路由
  'wallet-balance': (chain) => CHAIN_ROUTING[chain],

  // NFT 数据 -> Alchemy 优先（Ethereum 生态）
  'nft-data': ['alchemy', 'covalent'],

  // 交易历史 -> Alchemy/Covalent
  'transaction-history': (chain) => CHAIN_ROUTING[chain],
}
```

### 规则 3: 故障转移

```typescript
// 自动 fallback 机制
async function fetchWithFallback(providers: string[], request: Request) {
  for (const provider of providers) {
    try {
      const result = await clients[provider].fetch(request)
      return { data: result, provider }
    } catch (error) {
      console.warn(`[${provider}] failed, trying next...`)
      continue
    }
  }
  throw new Error('All providers failed')
}
```

---

## 💾 缓存策略

### 多层缓存

```typescript
// 1. 内存缓存（快速响应）
const memoryCache = new Map()

// 2. Supabase 缓存（持久化）
const dbCache = supabase.from('web3_cache')

// 3. 缓存时间策略
const CACHE_TTL = {
  'wallet-balance': 60,      // 1 分钟
  'token-price': 300,        // 5 分钟
  'nft-data': 3600,          // 1 小时
  'transaction-history': 60, // 1 分钟
}
```

---

## 🔧 限流控制

### 每个服务的限流配置

```typescript
const RATE_LIMITS = {
  alchemy: {
    requestsPerSecond: 25,    // 300M CU/月 ≈ 25 req/s
    burstSize: 100,
  },
  covalent: {
    requestsPerSecond: 5,     // 100k/月 ≈ 3-5 req/s
    burstSize: 20,
  },
  coingecko: {
    requestsPerMinute: 30,    // 免费 10-50/min，保守设置 30
    burstSize: 10,
  },
  ankr: {
    requestsPerSecond: 10,    // 公开 RPC 限制
    burstSize: 30,
  },
}
```

---

## 📊 使用场景示例

### 场景 1: 查询 Ethereum 钱包

```typescript
// 用户请求
GET /api/wallet/0x123.../overview?chain=ethereum

// 路由策略
1. 钱包余额 -> Alchemy
2. 代币价格 -> CoinGecko
3. NFT 数据 -> Alchemy
4. 交易历史 -> Alchemy

// Fallback
如果 Alchemy 失败 -> Covalent -> Ankr
```

### 场景 2: 查询 BSC 钱包

```typescript
// 用户请求
GET /api/wallet/0x123.../overview?chain=bsc

// 路由策略
1. 钱包余额 -> Covalent
2. 代币价格 -> CoinGecko
3. NFT 数据 -> Covalent
4. 交易历史 -> Covalent

// Fallback
如果 Covalent 失败 -> Ankr RPC
```

### 场景 3: 批量价格查询

```typescript
// 用户请求
POST /api/tokens/prices
{
  tokens: [
    { chain: 'ethereum', address: '0x...' },
    { chain: 'bsc', address: '0x...' },
    // ... 100 个代币
  ]
}

// 路由策略
1. 优先使用 CoinGecko（批量查询）
2. 如果 CoinGecko 无数据 -> Covalent 补充
3. 缓存结果 5 分钟

// 限流
- CoinGecko: 分批查询，每批 20 个
- 间隔 500ms 避免速率限制
```

---

## 🚀 实施步骤

### Phase 1: 基础设施（第 1-2 天）
- [ ] 创建文件结构
- [ ] 定义统一类型系统
- [ ] 实现缓存层
- [ ] 实现限流控制

### Phase 2: 客户端实现（第 3-5 天）
- [ ] 实现 Alchemy 客户端
- [ ] 实现 Covalent 客户端
- [ ] 实现 Ankr 客户端
- [ ] 实现 CoinGecko 客户端

### Phase 3: 路由层（第 6-7 天）
- [ ] 实现智能路由
- [ ] 实现故障转移
- [ ] 实现重试逻辑
- [ ] 单元测试

### Phase 4: API 迁移（第 8-9 天）
- [ ] 迁移 `/api/wallet/[address]/overview`
- [ ] 迁移 `/api/wallet/[address]/tokens`
- [ ] 迁移 `/api/wallet/[address]/nfts`
- [ ] 迁移价格相关 API

### Phase 5: 测试优化（第 10 天）
- [ ] 集成测试
- [ ] 性能测试
- [ ] 限流测试
- [ ] 文档更新

---

## 💰 成本估算

### 月度请求量估算

假设：
- 日活用户: 1000
- 每用户每天查询钱包: 5 次
- 每次查询涉及 API 调用: 10 次

**总请求量**: 1000 × 5 × 10 × 30 = **150 万次/月**

### 额度分配

| 服务 | 免费额度 | 分配比例 | 预计使用 | 状态 |
|------|---------|---------|---------|------|
| **Alchemy** | 300M CU | 60% | 90 万次 | ✅ 充足 |
| **Covalent** | 100k | 20% | 30 万次 | ⚠️ 需优化 |
| **CoinGecko** | ~120k/月 | 15% | 22 万次 | ✅ 充足 |
| **Ankr** | 无限 | 5% | 7.5 万次 | ✅ 充足 |

**结论**:
- ✅ Alchemy 和 CoinGecko 额度充足
- ⚠️ Covalent 需要配合缓存优化
- ✅ Ankr 作为备用完全够用

---

## 🎛️ 监控指标

### 关键指标

```typescript
const METRICS = {
  // 请求统计
  totalRequests: Counter,
  requestsByProvider: Counter,
  requestsByChain: Counter,

  // 性能指标
  responseTime: Histogram,
  cacheHitRate: Gauge,

  // 错误统计
  errorsByProvider: Counter,
  fallbackTriggers: Counter,

  // 额度使用
  alchemyCreditsUsed: Gauge,
  covalentCreditsUsed: Gauge,
}
```

### 告警规则

```typescript
const ALERTS = {
  // Alchemy 额度告警
  alchemyCreditsUsage: {
    threshold: 80,  // 80% 使用时告警
    action: 'switch_to_covalent',
  },

  // 错误率告警
  errorRate: {
    threshold: 5,   // 5% 错误率
    action: 'send_notification',
  },

  // 缓存命中率告警
  cacheHitRate: {
    threshold: 70,  // 低于 70% 告警
    action: 'optimize_cache',
  },
}
```

---

## 🔐 环境变量配置

```env
# Alchemy
ALCHEMY_API_KEY=your-alchemy-key
ALCHEMY_NETWORK=eth-mainnet

# Covalent
COVALENT_API_KEY=your-covalent-key

# Ankr
ANKR_API_KEY=your-ankr-key  # 可选

# CoinGecko
# 免费版无需 API key
# COINGECKO_API_KEY=your-key  # Pro 版本

# 缓存配置
REDIS_URL=redis://localhost:6379  # 可选，用于分布式缓存
ENABLE_MEMORY_CACHE=true
CACHE_TTL_BALANCE=60
CACHE_TTL_PRICE=300
CACHE_TTL_NFT=3600

# 限流配置
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=60  # 秒
```

---

## 📝 总结

### ✅ 优势

1. **高可用**: 4 个服务互为备份，单点故障不影响系统
2. **低成本**: 充分利用免费额度，预计可支持 1000+ DAU
3. **高性能**: 智能路由 + 多层缓存，响应时间 < 500ms
4. **易扩展**: 统一接口，新增服务只需实现客户端
5. **可监控**: 完整的指标和告警体系

### 🎯 下一步

1. 是否开始实施？我可以先实现基础架构
2. 需要调整路由策略吗？
3. 是否需要更详细的某个部分的设计？

准备好了就告诉我，我们开始实现！🚀
