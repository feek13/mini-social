# Sprint 7 - 钱包分析系统配置指南

## 概述

Sprint 7 实现了多链钱包分析功能，支持查询任意 EVM 钱包地址的资产、交易历史、NFT 等信息。

## 环境变量配置

在 `.env.local` 文件中添加以下配置：

```env
# Moralis API Key（必需）
MORALIS_API_KEY=your_moralis_api_key_here
```

### 获取 Moralis API Key

1. 访问 https://moralis.io/
2. 注册/登录账号
3. 进入 Dashboard
4. 创建新的 Web3 API 项目
5. 复制 API Key

**免费版限制：**
- 每秒 5 个请求
- 每天 40,000 个请求
- 支持所有主要 EVM 链

## 数据库迁移

在 Supabase SQL Editor 中运行以下脚本：

```bash
supabase-migration-sprint7-wallet-analysis.sql
```

该脚本会创建以下表：
- `wallet_trackers` - 钱包追踪记录
- `wallet_snapshots` - 钱包数据快照缓存
- `wallet_labels` - 智能标签系统
- `wallet_comparisons` - 钱包对比功能

## API 端点说明

### 1. 钱包概览

```bash
GET /api/wallet/[address]/overview?chains=ethereum,bsc,polygon
```

获取钱包在多条链上的完整概览，包括：
- 原生代币余额
- ERC20 代币列表
- NFT 数量
- 总资产价值
- 钱包标签
- 被追踪次数

**示例:**
```bash
curl http://localhost:3000/api/wallet/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb/overview
```

### 2. 代币余额

```bash
GET /api/wallet/[address]/tokens?chain=ethereum&excludeSpam=true
```

获取指定链上的 ERC20 代币余额。

**参数:**
- `chain`: 链名称（ethereum, bsc, polygon 等）
- `excludeSpam`: 排除垃圾代币（默认 true）
- `excludeUnverified`: 排除未验证合约（默认 true）

### 3. NFT 资产

```bash
GET /api/wallet/[address]/nfts?chain=ethereum&limit=50
```

获取钱包的 NFT 资产列表。

**参数:**
- `chain`: 链名称
- `limit`: 返回数量（1-500）
- `excludeSpam`: 排除垃圾 NFT（默认 true）

### 4. 交易历史

```bash
GET /api/wallet/[address]/transactions?chain=ethereum&limit=25
```

获取钱包的交易历史记录。

**参数:**
- `chain`: 链名称
- `limit`: 返回数量（1-500）
- `fromBlock`: 起始区块
- `toBlock`: 结束区块

### 5. 钱包追踪

```bash
# 获取追踪列表
GET /api/wallet/trackers

# 创建追踪
POST /api/wallet/trackers
Body: {
  "wallet_address": "0x...",
  "nickname": "Vitalik",
  "notes": "以太坊创始人",
  "notification_enabled": true
}

# 更新追踪
PATCH /api/wallet/trackers/[id]

# 删除追踪
DELETE /api/wallet/trackers/[id]
```

## 支持的链

| 链 | Chain ID | 原生代币 |
|----|----------|----------|
| Ethereum | `ethereum` | ETH |
| BNB Smart Chain | `bsc` | BNB |
| Polygon | `polygon` | MATIC |
| Arbitrum | `arbitrum` | ETH |
| Optimism | `optimism` | ETH |
| Base | `base` | ETH |
| Avalanche | `avalanche` | AVAX |
| Fantom | `fantom` | FTM |
| Cronos | `cronos` | CRO |
| Gnosis | `gnosis` | xDAI |
| Linea | `linea` | ETH |
| zkSync Era | `zksync` | ETH |

## 测试步骤

### 1. 配置环境变量

确保 `.env.local` 包含 `MORALIS_API_KEY`。

### 2. 运行数据库迁移

在 Supabase SQL Editor 运行 `supabase-migration-sprint7-wallet-analysis.sql`。

### 3. 启动开发服务器

```bash
npm run dev
```

### 4. 测试 API 端点

使用 Vitalik 的钱包地址测试：

```bash
# 测试钱包概览
curl http://localhost:3000/api/wallet/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/overview

# 测试代币余额（Ethereum）
curl http://localhost:3000/api/wallet/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/tokens?chain=ethereum

# 测试 NFT（Ethereum）
curl "http://localhost:3000/api/wallet/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/nfts?chain=ethereum&limit=10"

# 测试交易历史（Ethereum）
curl "http://localhost:3000/api/wallet/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/transactions?chain=ethereum&limit=5"
```

## 缓存机制

系统自动缓存钱包数据：

| 数据类型 | 缓存时间 |
|---------|---------|
| 余额数据 | 5 分钟 |
| NFT 数据 | 15 分钟 |
| 交易历史 | 10 分钟 |
| 完整快照 | 1 小时 |

缓存数据存储在 `wallet_snapshots` 表中，过期后自动重新获取。

## 故障排查

### 问题 1: "Moralis API key not configured"

**解决方案:**
1. 检查 `.env.local` 是否包含 `MORALIS_API_KEY`
2. 重启开发服务器

### 问题 2: "Invalid Ethereum address format"

**解决方案:**
确保地址格式正确：
- 必须以 `0x` 开头
- 长度为 42 个字符
- 只包含十六进制字符 (0-9, a-f, A-F)

### 问题 3: 请求速率限制

**错误:** "Rate limit exceeded"

**解决方案:**
- 免费版每秒限制 5 个请求
- 使用缓存减少 API 调用
- 升级到付费计划

### 问题 4: 数据库表不存在

**错误:** "relation does not exist"

**解决方案:**
在 Supabase SQL Editor 运行迁移脚本。

## 下一步开发计划

- [ ] 创建钱包搜索页面 UI
- [ ] 实现代币余额展示组件
- [ ] 实现多链数据聚合视图
- [ ] 实现交易历史时间线
- [ ] 添加收益图表可视化
- [ ] 实现盈亏分析统计
- [ ] 集成 DeFi 协议识别
- [ ] 实现钱包追踪功能 UI
- [ ] 实现智能标签系统
- [ ] 实现钱包对比功能
- [ ] 集成到个人资料页

## 参考文档

- [Moralis 文档](https://docs.moralis.io/web3-data-api/evm)
- [Moralis API README](./lib/moralis/README.md)
- [数据库类型定义](./types/database.ts)
- [GMGN 参考示例](https://gmgn.ai/bsc/address/5r6XthUX_0x1063bf0e728f8042533927cab626ca3ed96d56ea)

## 技术栈

- **前端**: Next.js 15, React, TypeScript, Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: Supabase (PostgreSQL)
- **区块链数据**: Moralis Web3 API
- **支持链**: 12+ EVM 链

## 注意事项

1. **EVM 地址通用性**: 同一个地址在所有 EVM 链上通用
2. **API 限制**: 注意 Moralis 免费版的速率限制
3. **缓存策略**: 合理使用缓存减少 API 调用
4. **数据安全**: 钱包地址是公开信息，不涉及私钥
5. **RLS 策略**: 已配置完整的行级安全策略
