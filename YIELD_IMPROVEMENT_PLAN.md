# DeFi 收益率池子改进方案

## 问题诊断

当前实现的主要问题：
1. ❌ 筛选器分散在一个大表单里，操作不顺手
2. ❌ 币对信息不突出，用户看不清是哪些代币的池子
3. ❌ 缺少 TVL 范围筛选（行业标准是 $10M+）
4. ❌ 卡片视图信息过载，一屏只能看 3-4 个池子
5. ❌ 排序选项不够直观

## 改进方案（基于 DeFiLlama / Beefy / Yearn 最佳实践）

### 阶段 1：优化筛选器布局

#### 1.1 顶部快捷筛选（Toggle Buttons）
```
[全部] [稳定币] [单一资产] [低IL风险] [高TVL ($10M+)] [超高APY (50%+)]
```
- 点击切换，可多选
- 选中状态有明显的视觉反馈（蓝色高亮）

#### 1.2 第二行：核心筛选条件
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│  Chain: [All ▼] │  TVL: [All ▼]   │  APY: [All ▼]   │  Sort: [APY ▼]  │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

**TVL 选项：**
- All
- $1M - $10M
- $10M - $100M
- $100M+（推荐）

**APY 选项：**
- All
- 0% - 10%
- 10% - 50%
- 50%+

**Sort 选项：**
- APY (High to Low) - 默认
- APY (Low to High)
- TVL (High to Low)
- 30d Avg APY (High to Low) - 推荐

#### 1.3 搜索框
```
🔍 搜索池子、代币或协议...  [例如: ETH-USDC, Aave, Uniswap]
```

### 阶段 2：重新设计展示方式

#### 2.1 默认使用紧凑表格视图（可切换到卡片）

**表格列：**

| Pool | Chain | TVL | APY | Base | Reward | 30d Avg | IL Risk | 操作 |
|------|-------|-----|-----|------|--------|---------|---------|------|
| **ETH-USDC** 🔵 | Ethereum | $125M | **8.5%** | 2.1% | 6.4% | 7.8% | 🟢 Low | [详情] |
| **AAVE Lending** | Polygon | $45M | **12.3%** | 12.3% | - | 11.5% | 🔴 None | [详情] |

**关键改进：**
- 币对名称加粗、大字号
- 添加稳定币图标 🔵（USDC、USDT 等）
- APY 数字加粗，Base 和 Reward 分开显示
- 30d Avg APY 显示，用灰色标注（更稳定的参考值）
- IL Risk 用颜色标识：🟢 Low / 🟡 Medium / 🔴 High / ⚪ None

#### 2.2 表格支持列头排序
- 点击 "APY" 列头 → 按 APY 排序
- 点击 "TVL" 列头 → 按 TVL 排序
- 点击 "30d Avg" 列头 → 按 30d 平均 APY 排序

#### 2.3 视图切换按钮
```
[📊 Table View] [🎴 Card View]  ← 在右上角
```

### 阶段 3：优化卡片视图

如果用户选择卡片视图，改进当前的 `YieldCard`：

```
┌─────────────────────────────────────┐
│ 🪙 ETH-USDC                         │ ← 币对名称，大字号，加代币图标
│ Ethereum  🔵 Stablecoin             │ ← 链标签 + 特性标签
├─────────────────────────────────────┤
│ APY: 8.5%         30d Avg: 7.8%    │ ← 当前APY 和 30天平均对比
│ ├─ Base:   2.1%                    │
│ └─ Reward: 6.4%                    │
├─────────────────────────────────────┤
│ TVL: $125M       IL Risk: 🟢 Low   │
│ [查看详情]                          │
└─────────────────────────────────────┘
```

**改进点：**
1. 币对放在最上方，字号最大
2. 30d Avg APY 显示在 APY 旁边，方便对比
3. TVL 和 IL Risk 放在底部
4. 减少视觉干扰（去掉过多的颜色渐变）

### 阶段 4：增强的功能

#### 4.1 APY 历史趋势（可选）
- 显示 7 天 APY 趋势线图（mini sparkline）
- 用户可以快速判断 APY 是否稳定

#### 4.2 池子详情页
点击"查看详情"后，显示：
- APY 构成详解（Base APY 来源、Reward 代币种类）
- TVL 历史图表
- IL 风险说明
- 池子合约地址、审计报告链接（如果有）
- 一键添加到钱包

#### 4.3 对比功能优化
- 当前的 `/defi/tools` 页面的对比功能不错
- 建议在主页面添加"加入对比"按钮：
  ```
  [✓ 加入对比] ← 点击后加入对比列表
  ```
- 底部显示对比浮窗：
  ```
  [对比 (3)] ETH-USDC, BTC-USDT, AAVE  [查看对比 →]
  ```

## 实施优先级

### P0 - 必须做（核心用户体验）
1. ✅ 顶部快捷筛选按钮（稳定币、单一资产、低IL、高TVL）
2. ✅ 添加 TVL 范围筛选
3. ✅ 币对名称放大、加粗（表格或卡片视图都要改）
4. ✅ 30d Avg APY 显示（更稳定的参考值）

### P1 - 应该做（提升专业度）
1. ⚡ 表格视图（默认）+ 卡片视图切换
2. ⚡ 表格支持列头排序
3. ⚡ 搜索框支持币对、协议名搜索

### P2 - 可以做（锦上添花）
1. 🌟 APY 历史趋势 mini 图表
2. 🌟 池子详情页（完整信息）
3. 🌟 底部对比浮窗

## 技术实施建议

### 1. 表格组件
- 使用 TanStack Table (React Table v8) 或 自己实现简单的表格
- 支持排序、筛选、分页

### 2. 数据结构
确保 API 返回的数据包含：
```typescript
interface YieldPool {
  pool: string           // 池子ID
  symbol: string         // 币对：ETH-USDC
  project: string        // 协议名：Uniswap V3
  chain: string          // 链：Ethereum
  tvlUsd: number         // TVL（美元）
  apy: number            // 当前 APY
  apyBase: number        // Base APY
  apyReward: number      // Reward APY
  apyMean30d: number     // 30天平均 APY
  apyPct7D: number       // 7天变化百分比
  ilRisk: string         // IL 风险：no / yes / unknown
  stablecoin: boolean    // 是否稳定币
  exposure: string       // single / multi
}
```

### 3. 组件结构
```
/app/defi/page.tsx
  ├─ YieldFilters.tsx         (顶部筛选器)
  ├─ YieldTableView.tsx       (表格视图)
  ├─ YieldCardView.tsx        (卡片视图)
  └─ YieldPoolDetail.tsx      (详情页)
```

## 参考资料

- **DeFiLlama Yields**: https://defillama.com/yields
  - 支持 8,700+ 池子，373 个协议
  - 最佳实践：TVL $10M+，按 30d Avg APY 排序

- **Beefy Finance**: https://app.beefy.com
  - 特点：多链支持，自动复利
  - 筛选：按 APR、TVL、资产类型

- **Yearn Finance**: https://yearn.fi/vaults
  - 特点：策略自动化，历史收益透明
  - 筛选：按链、风险等级、收益类型

## 总结

核心改进点：
1. **筛选器要简洁、直观**：顶部 Toggle 按钮 + 下拉菜单，不要大表单
2. **币对信息要突出**：这是用户最关心的，应该是最大的字号
3. **TVL 筛选是刚需**：建议默认显示 $10M+ 的池子
4. **表格视图更高效**：一屏能看到更多池子，方便对比
5. **30d Avg APY 更可靠**：当前 APY 可能被临时激励拉高

希望这个方案能帮助你优化收益率功能！
