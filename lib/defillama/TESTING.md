# DeFiLlama 客户端测试指南

## 测试方式

我们提供了两种测试方式：

### 方式 1: 独立脚本测试（推荐）

使用命令行直接运行测试脚本，输出详细的测试结果和彩色日志。

#### 步骤：

1. **安装依赖**（首次运行）:
   ```bash
   npm install
   ```

2. **运行测试**:
   ```bash
   npm run test:defillama
   ```

   或直接使用 npx:
   ```bash
   npx tsx scripts/test-defillama.ts
   ```

#### 输出示例：

```
============================================================
DeFiLlama 客户端测试
============================================================

[测试] 获取协议列表 (前 10 个)
  共获取到 1234 个协议
  前 10 个协议:
    1. Lido (lido)
       TVL: $30,123,456,789
       分类: Liquid Staking
       链: Ethereum, Polygon, ...
    ...
✅ 通过 (1234ms)

[测试] 获取 Aave 协议详情
  名称: Aave
  描述: Aave is a decentralized ...
  ...
✅ 通过 (567ms)

...

============================================================
测试总结
============================================================
总测试数: 9
通过: 9 ✅
失败: 0 ❌
总耗时: 5678ms
============================================================
```

### 方式 2: API 路由测试

通过 HTTP API 运行测试，可以在浏览器中查看 JSON 结果。

#### 步骤：

1. **启动开发服务器**:
   ```bash
   npm run dev
   ```

2. **访问测试端点**:
   - 浏览器打开: http://localhost:3000/api/test-defillama
   - 或使用 curl:
     ```bash
     curl http://localhost:3000/api/test-defillama
     ```

3. **查看控制台输出**:
   - 测试详情会打印在服务器控制台（终端）
   - 浏览器显示 JSON 格式的测试结果

#### JSON 响应结构：

```json
{
  "success": true,
  "tests": [
    {
      "name": "获取协议列表",
      "status": "success",
      "data": { ... },
      "duration": 1234
    },
    ...
  ],
  "summary": {
    "total": 6,
    "passed": 6,
    "failed": 0,
    "totalDuration": 5678
  }
}
```

## 测试内容

### 测试 1: 获取协议列表
- 测试 `getProtocols()` 方法
- 验证返回数据结构
- 显示前 10 个协议

### 测试 2: 获取协议详情
- 测试 `getProtocol('aave')` 方法
- 验证详细信息完整性
- 显示 TVL 和支持的链

### 测试 3: 获取代币价格
- 测试 `getTokenPrice()` 方法
- 使用 WETH 地址进行测试
- 验证价格数据格式

### 测试 4: 批量获取代币价格
- 测试 `getTokenPrices()` 方法
- 获取 DAI、USDC、USDT 价格
- 验证批量请求功能

### 测试 5: 搜索协议
- 测试 `searchProtocols('uniswap')` 方法
- 验证搜索结果准确性
- 显示前 5 个匹配结果

### 测试 6: 获取链数据
- 测试 `getChains()` 方法
- 获取所有链的 TVL
- 显示 TVL 前 5 的链

### 测试 7: 获取高收益率池子
- 测试 `getTopYields()` 方法
- 过滤 TVL > $1M 的池子
- 按 APY 排序显示

### 测试 8: 按分类获取协议
- 测试 `getProtocolsByCategory('Dexes')` 方法
- 统计 DEX 协议数量
- 显示 TVL 排名

### 测试 9: 获取 TVL 排名
- 测试 `getTopProtocols()` 方法
- 获取前 5 名协议
- 显示 24h 变化

## 常见问题

### Q: 测试失败怎么办？

A: 可能的原因：
1. **网络问题**: DeFiLlama API 需要网络连接
2. **API 限流**: 短时间内请求过多
3. **数据格式变化**: DeFiLlama API 可能更新

解决方法：
- 检查网络连接
- 等待几分钟后重试
- 查看错误信息定位问题

### Q: 测试很慢怎么办？

A: 这是正常的，因为：
- 需要从 DeFiLlama API 获取真实数据
- 有多个网络请求
- 某些数据量较大（如所有协议列表）

可以：
- 只运行特定测试
- 使用更快的网络环境

### Q: 如何只运行部分测试？

A: 修改 `scripts/test-defillama.ts` 文件，注释掉不需要的测试。

例如，只测试协议列表和搜索：

```typescript
// 在 main() 函数中注释掉不需要的测试
async function main() {
  // ...
  await runTest('获取协议列表 (前 10 个)', async () => { ... })
  // await runTest('获取 Aave 协议详情', async () => { ... })  // 注释掉
  // await runTest('获取 WETH 代币价格', async () => { ... })  // 注释掉
  await runTest('搜索 Uniswap 协议', async () => { ... })
  // ...
}
```

### Q: 可以在 CI/CD 中使用吗？

A: 可以，测试脚本会返回正确的退出码：
- 所有测试通过: `exit 0`
- 有测试失败: `exit 1`

在 CI 配置中添加：

```yaml
# .github/workflows/test.yml
- name: Test DeFiLlama Client
  run: npm run test:defillama
```

## 调试技巧

### 1. 启用详细日志

在测试脚本中，所有 API 调用都会输出详细信息。

### 2. 检查单个 API 调用

可以在 Node.js REPL 中测试：

```bash
npx tsx
```

```typescript
import { defillama } from './lib/defillama/client'

// 测试单个方法
const protocols = await defillama.getProtocols()
console.log(protocols[0])
```

### 3. 使用浏览器开发者工具

访问 API 路由测试时，打开浏览器开发者工具：
- Network 标签可以查看请求详情
- Console 可以查看日志输出

## 性能参考

在正常网络环境下的预期耗时：

| 测试项目 | 预期耗时 |
|---------|----------|
| 获取协议列表 | 1-3 秒 |
| 获取协议详情 | 500-1500ms |
| 获取代币价格 | 300-800ms |
| 批量获取价格 | 500-1000ms |
| 搜索协议 | 1-3 秒（依赖协议列表）|
| 获取链数据 | 500-1500ms |
| 获取收益率 | 2-5 秒（数据量大）|

总耗时通常在 5-15 秒之间。

## 扩展测试

你可以添加自己的测试用例：

```typescript
// scripts/test-defillama.ts

await runTest('自定义测试', async () => {
  // 你的测试逻辑
  const result = await defillama.someMethod()

  if (!result) {
    throw new Error('测试失败原因')
  }

  log(`  测试结果: ${result}`, 'yellow')
})
```

## 相关资源

- [DeFiLlama API 文档](https://defillama.com/docs/api)
- [项目 README](./README.md)
- [使用示例](./example.ts)
