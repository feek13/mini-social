# DeFiLlama 集成测试指南

本文档说明如何测试 DeFiLlama API 集成。

---

## 📋 前置条件

1. **环境变量配置**
   确保 `.env.local` 文件包含以下变量：
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. **数据库准备**
   在 Supabase SQL Editor 中运行：
   ```bash
   supabase-migration-defillama.sql
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```
   服务器将在 http://localhost:3000 运行

---

## 🧪 测试方法

### 方法 1: 快速测试 (推荐)

快速验证所有核心功能是否正常：

```bash
npm run test:defillama:quick
```

**测试内容**:
- ✅ 协议列表 API (基本、搜索、过滤)
- ✅ 协议详情 API (有效、无效协议)
- ✅ 收益率 API (基本、过滤)
- ✅ 代币价格 API (单个、多个、验证)

**预期结果**: 13/13 测试通过

**执行时间**: ~30 秒

---

### 方法 2: 完整测试套件

运行包含 30+ 个测试用例的完整测试：

```bash
npm run test:defillama:full
```

**测试内容**:
- ✅ 所有 API 端点
- ✅ 数据结构验证
- ✅ 错误处理
- ✅ 缓存机制
- ✅ 性能测试
- ✅ 边界条件

**执行时间**: ~2-5 分钟

⚠️ **注意**: 由于需要等待 API 响应，可能会超时。如果超时，请使用快速测试。

---

### 方法 3: 原始测试脚本

使用原有的简单测试脚本：

```bash
npm run test:defillama
```

**测试内容**:
- ✅ 基础 API 连接
- ✅ 数据格式验证

---

## 🔍 手动测试

### 1. 测试协议列表 API

#### 基本请求
```bash
curl "http://localhost:3000/api/defi/protocols?limit=10" | jq
```

#### 搜索协议
```bash
curl "http://localhost:3000/api/defi/protocols?search=aave" | jq
```

#### 分类过滤
```bash
curl "http://localhost:3000/api/defi/protocols?category=Dexs&limit=5" | jq
```

**可用的分类**:
- `Dexs`
- `Lending`
- `Derivatives`
- `Yield`
- `Chain`
- `DEX Aggregator`
- `Launchpad`
- `SoFi`
- `Trading App`

#### 链过滤
```bash
curl "http://localhost:3000/api/defi/protocols?chain=Ethereum&limit=5" | jq
```

---

### 2. 测试协议详情 API

#### 获取 Aave 详情
```bash
curl "http://localhost:3000/api/defi/protocols/aave" | jq
```

#### 获取 Uniswap 详情
```bash
curl "http://localhost:3000/api/defi/protocols/uniswap" | jq
```

#### 测试无效协议 (应返回 404)
```bash
curl -w "\nHTTP %{http_code}\n" "http://localhost:3000/api/defi/protocols/invalid"
```

---

### 3. 测试收益率 API

#### 基本请求
```bash
curl "http://localhost:3000/api/defi/yields?limit=10" | jq
```

#### 链过滤
```bash
curl "http://localhost:3000/api/defi/yields?chain=Ethereum&limit=5" | jq
```

#### 协议过滤
```bash
curl "http://localhost:3000/api/defi/yields?protocol=aave&limit=5" | jq
```

#### 最低 APY 过滤
```bash
curl "http://localhost:3000/api/defi/yields?minApy=10&limit=5" | jq
```

#### 组合过滤
```bash
curl "http://localhost:3000/api/defi/yields?chain=Ethereum&protocol=aave&minApy=1&limit=3" | jq
```

---

### 4. 测试代币价格 API

#### 单个代币 (WETH)
```bash
curl -X POST "http://localhost:3000/api/defi/prices" \
  -H "Content-Type: application/json" \
  -d '{
    "tokens": [
      {"chain": "ethereum", "address": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"}
    ]
  }' | jq
```

#### 多个代币 (WETH, USDC, WMATIC)
```bash
curl -X POST "http://localhost:3000/api/defi/prices" \
  -H "Content-Type: application/json" \
  -d '{
    "tokens": [
      {"chain": "ethereum", "address": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"},
      {"chain": "ethereum", "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"},
      {"chain": "polygon", "address": "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"}
    ]
  }' | jq
```

#### 空请求 (应返回 400)
```bash
curl -w "\nHTTP %{http_code}\n" -X POST "http://localhost:3000/api/defi/prices" \
  -H "Content-Type: application/json" \
  -d '{"tokens": []}'
```

---

## 🌐 Web UI 测试

访问 Web 界面测试：

1. **DeFi 页面**
   ```
   http://localhost:3000/defi
   ```
   - 查看协议列表
   - 测试搜索功能
   - 测试分类过滤

2. **DeFi 测试页面** (如果存在)
   ```
   http://localhost:3000/defi/test
   ```
   - 测试所有 API 集成
   - 查看实时数据

---

## 📊 验证缓存机制

### 1. 查看数据库缓存

在 Supabase SQL Editor 中执行：

```sql
-- 查看协议缓存
SELECT
  protocol_slug,
  protocol_name,
  tvl,
  category,
  cached_at,
  expires_at
FROM defi_protocols
ORDER BY cached_at DESC
LIMIT 10;

-- 查看收益率缓存
SELECT
  pool_id,
  chain,
  project,
  apy,
  tvl_usd,
  cached_at,
  expires_at
FROM defi_yields
ORDER BY apy DESC
LIMIT 10;

-- 查看代币价格缓存
SELECT
  chain,
  token_address,
  symbol,
  price,
  cached_at,
  expires_at
FROM defi_token_prices
ORDER BY cached_at DESC
LIMIT 10;
```

### 2. 测试缓存性能

```bash
# 第一次请求 (从 API 获取)
time curl -s "http://localhost:3000/api/defi/protocols?limit=100" > /dev/null

# 第二次请求 (从缓存读取)
time curl -s "http://localhost:3000/api/defi/protocols?limit=100" > /dev/null
```

**预期**: 第二次请求应该快 90%+

---

## 🐛 常见问题排查

### 问题 1: 连接超时

**症状**: `Error: connect ETIMEDOUT`

**解决方案**:
1. 检查网络连接
2. 确认 DeFiLlama API 是否可访问
3. 检查防火墙设置

### 问题 2: 数据库错误

**症状**: `Error: relation "defi_protocols" does not exist`

**解决方案**:
1. 确认已运行 `supabase-migration-defillama.sql`
2. 检查 Supabase 连接配置
3. 验证环境变量是否正确

### 问题 3: 缓存未生效

**症状**: 每次请求都很慢

**解决方案**:
1. 检查数据库中是否有缓存数据
2. 确认 `expires_at` 时间是否有效
3. 查看服务器日志确认缓存逻辑

### 问题 4: 分类过滤返回空

**症状**: `category=Dexes` 返回空数组

**解决方案**:
- 使用正确的分类名称 `Dexs` (不是 `Dexes`)
- 参考上面的"可用的分类"列表

---

## 📝 测试检查清单

使用此检查清单确保所有功能正常：

### 协议列表 API
- [ ] 基本请求返回数据
- [ ] 搜索功能正常
- [ ] 分类过滤正常
- [ ] 链过滤正常
- [ ] limit 参数生效
- [ ] 缓存机制工作

### 协议详情 API
- [ ] 有效协议返回详情
- [ ] 无效协议返回 404
- [ ] 包含 TVL 历史数据
- [ ] 包含各链 TVL

### 收益率 API
- [ ] 基本请求返回数据
- [ ] 链过滤正常
- [ ] 协议过滤正常
- [ ] APY 过滤正常
- [ ] 组合过滤正常
- [ ] 缓存机制工作

### 代币价格 API
- [ ] 单个代币查询正常
- [ ] 多个代币查询正常
- [ ] 跨链查询正常
- [ ] 空请求返回 400
- [ ] 价格数据准确

### 缓存机制
- [ ] 数据成功写入数据库
- [ ] 过期时间正确设置
- [ ] 缓存命中提升性能
- [ ] 过期数据正确清理

---

## 📄 相关文档

- **测试报告**: `DEFILLAMA_TEST_REPORT.md`
- **API 文档**: `lib/defillama/README.md`
- **数据库迁移**: `supabase-migration-defillama.sql`
- **项目文档**: `CLAUDE.md`

---

## 🎯 验收标准

集成测试通过的标准：

✅ 所有 API 端点可访问 (13/13)
✅ 数据结构正确
✅ 错误处理完善
✅ 缓存机制工作
✅ 性能提升 90%+
✅ 跨链支持正常

**当前状态**: ✅ **所有测试通过，可以部署到生产环境**

---

**最后更新**: 2025-10-12
