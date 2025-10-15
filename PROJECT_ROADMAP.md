# MiniSocial - 项目开发路线图

本文档记录所有 Sprint 的进度、功能清单和后续计划。

---

## 📅 项目时间线

| Sprint | 功能 | 状态 | 完成时间 |
|--------|------|------|----------|
| Sprint 1-2 | 核心社交功能 | ✅ 完成 | 已完成 |
| Sprint 3 | 钱包验证与声誉系统 | ✅ 完成 | 2025-01-10 |
| Sprint 4A | Web3 社交声誉系统 | 🔄 进行中 | - |
| Sprint 4B | 链上动态与打赏（可选） | 📋 计划中 | - |
| Sprint 5 | 多链支持 | 📋 计划中 | - |

---

## ✅ Sprint 1-2: 核心社交功能（已完成）

### 功能清单

#### 用户系统
- ✅ 用户注册与登录（Supabase Auth）
- ✅ 个人资料管理（用户名、头像、简介、位置）
- ✅ 渐变头像系统（DiceBear API，多种模板）
- ✅ 个人主页（展示动态、统计数据）

#### 动态系统
- ✅ 发布动态（280 字符限制）
- ✅ 转发功能（支持添加评论）
- ✅ 点赞系统（乐观更新）
- ✅ 评论系统（嵌套评论支持）
- ✅ 删除动态

#### 社交功能
- ✅ 关注/取关用户
- ✅ 特别关注（notify_on_post）
- ✅ 关注者/正在关注列表

#### 通知系统
- ✅ 5 种通知类型：
  - 点赞通知
  - 评论通知
  - 转发通知
  - 关注通知
  - 发文通知（特别关注）
- ✅ 实时未读计数
- ✅ 通知列表页面
- ✅ 标记已读功能

#### 高级功能
- ✅ 搜索功能（用户、动态）
- ✅ 搜索建议（实时）
- ✅ 热门动态（热度算法）
- ✅ 标签系统（#hashtag）
- ✅ 提及功能（@mention）

#### DeFi 集成
- ✅ DeFiLlama API 集成
- ✅ 协议数据查询（1000+ 协议）
- ✅ 收益率池子查询
- ✅ 代币价格查询
- ✅ TVL 历史图表
- ✅ DeFi 数据嵌入（动态中）
- ✅ PancakeSwap 专属集成

### 技术架构
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- Supabase (PostgreSQL + Auth)
- Recharts（图表可视化）
- RainbowKit + Wagmi（钱包连接）

---

## ✅ Sprint 3: 钱包验证与声誉系统（已完成）

### 完成时间
2025-01-10

### 功能清单

#### 钱包验证
- ✅ 连接 MetaMask 钱包
- ✅ 签名验证钱包所有权
- ✅ 保存钱包地址到数据库
- ✅ 钱包验证状态管理

#### 链上数据获取（Etherscan API）
- ✅ ETH 余额查询
- ✅ 普通交易查询
- ✅ 内部交易查询
- ✅ 代币转账查询
- ✅ DeFi 协议自动识别
- ✅ 钱包综合统计（WalletStats）

#### 声誉评分算法
- ✅ 多维度评分系统：
  - 钱包年龄（0-20 分，权重 20%）
  - 活跃度（0-25 分，权重 25%）
  - DeFi 参与度（0-30 分，权重 30%）
  - 资产规模（0-15 分，权重 15%）
  - 社交活动（0-10 分，权重 10%）
- ✅ 5 个等级系统：
  - 🥉 Bronze (0-19 分)
  - 🥈 Silver (20-39 分)
  - 🥇 Gold (40-59 分)
  - 💎 Diamond (60-79 分)
  - 👑 Legend (80-100 分)

#### 后端 API
- ✅ `POST /api/wallet/reputation/calculate` - 计算并更新声誉
- ✅ `GET /api/wallet/stats?username=xxx` - 获取钱包统计（带缓存）

#### 前端组件
- ✅ `WalletBadge` - 钱包验证徽章（✓ + 等级表情）
- ✅ `ReputationCard` - 声誉详情卡片
  - 等级和分数显示
  - 进度条（到下一等级）
  - 统计数据网格（钱包年龄、交易数、协议数）
  - 刷新按钮
  - 最后更新时间

#### 数据库设计
- ✅ `profiles` 表新增字段：
  - `reputation_score` - 声誉分数
  - `reputation_level` - 声誉等级
  - `reputation_updated_at` - 最后更新时间
  - `on_chain_tx_count` - 链上交易数
  - `defi_protocol_count` - DeFi 协议数
  - `wallet_age_days` - 钱包年龄
  - `eth_balance` - ETH 余额
- ✅ `reputation_history` 表 - 历史记录
- ✅ `user_reputation_summary` 视图 - 排行榜视图

#### 性能优化
- ✅ 1 小时缓存（钱包统计）
- ✅ 失败降级（API 失败时返回缓存）
- ✅ 请求队列（Etherscan API 速率限制）

### 测试结果
- ✅ 钱包验证流程正常
- ✅ 声誉计算准确
- ✅ UI 显示完美
- ✅ 测试账号：29 分，Silver 等级

### 文件清单
```
supabase-migration-reputation-system.sql   # 数据库迁移
lib/etherscan/account.ts                   # Etherscan 集成
lib/reputation/calculator.ts               # 声誉算法
app/api/wallet/reputation/calculate/route.ts  # 计算 API
app/api/wallet/stats/route.ts              # 统计 API
components/WalletBadge.tsx                 # 徽章组件
components/ReputationCard.tsx              # 卡片组件
```

---

## 🔄 Sprint 4A: Web3 社交声誉系统（进行中）

### 开始时间
2025-01-10

### 目标
让声誉系统融入社交场景，增加 NFT 头像功能，提升用户信任度。

### 预计时间
5-7 小时

### 功能规划

#### 阶段 1：PostCard 和 CommentCard 集成徽章（45 分钟）
- [ ] 修改 `PostCard.tsx`，在作者名旁显示 WalletBadge
- [ ] 修改 `CommentList.tsx`，评论中显示徽章
- [ ] 添加 hover tooltip
- [ ] 响应式设计适配

**预期效果：**
- 动态中每个作者名字旁显示 ✓ + 等级表情
- 鼠标悬停显示详细声誉信息
- 提升用户信任度

---

#### 阶段 2：声誉详情弹窗（1 小时）
- [ ] 创建 `ReputationModal.tsx` 组件
- [ ] 显示用户完整声誉信息
- [ ] 各维度得分雷达图（Recharts）
- [ ] 历史趋势折线图
- [ ] 点击徽章即可打开

**预期效果：**
- 点击任何 WalletBadge 打开详情弹窗
- 可视化展示各维度得分
- 查看声誉变化趋势

---

#### 阶段 3：排行榜 API（30 分钟）
- [ ] 创建 `GET /api/leaderboard` 路由
- [ ] 支持查询参数：
  - `level`: 筛选等级
  - `timeRange`: 时间范围（week/month/all）
  - `page`: 分页
  - `limit`: 每页数量
- [ ] 使用 `user_reputation_summary` 视图
- [ ] 计算趋势（与上周/上月对比）

**预期效果：**
- 提供排行榜数据 API
- 支持灵活筛选和分页

---

#### 阶段 4：排行榜页面（1 小时）
- [ ] 创建 `/leaderboard` 页面
- [ ] 排行榜卡片列表
- [ ] 筛选器 UI（等级、时间）
- [ ] 分页组件
- [ ] 响应式设计

**预期效果：**
- 用户可以查看全站声誉排行
- 激励用户提升声誉
- 发现高质量用户

---

#### 阶段 5：NFT 头像功能（2 小时）
- [ ] 创建 NFT 检测 API（使用 Alchemy）
- [ ] 创建 NFT 选择器组件
- [ ] 修改 Avatar 组件支持 NFT
- [ ] 数据库添加 NFT 字段
- [ ] NFT 头像特殊边框标识

**预期效果：**
- 用户可以设置 NFT 作为头像
- NFT 头像有特殊视觉标识
- 展示 Web3 身份

**数据库变更：**
```sql
-- profiles 表新增字段
nft_avatar_url          TEXT
nft_contract_address    TEXT
nft_token_id           TEXT
```

**Alchemy API 配置：**
```env
NEXT_PUBLIC_ALCHEMY_API_KEY=oglrc_W8xnJbUcVhY5XqJ
```

---

#### 阶段 6：测试和优化（30 分钟）
- [ ] 完整流程测试
- [ ] 性能优化（图片懒加载、API 缓存）
- [ ] 移动端适配检查
- [ ] 错误处理完善

---

### 技术栈
- **NFT 数据**: Alchemy API
- **图表**: Recharts（雷达图、折线图）
- **钱包**: RainbowKit + Wagmi
- **Modal**: 自定义模态框组件

### 文件清单（计划）
```
supabase-migration-sprint4.sql             # 数据库迁移（已完成）
app/api/leaderboard/route.ts               # 排行榜 API
app/api/nft/owned/route.ts                 # NFT 数据 API
app/api/profile/nft-avatar/route.ts        # 设置 NFT 头像 API
app/leaderboard/page.tsx                   # 排行榜页面
components/ReputationModal.tsx             # 声誉详情弹窗
components/LeaderboardCard.tsx             # 排行榜卡片
components/NFTAvatarPicker.tsx             # NFT 选择器
components/PostCard.tsx                    # 修改：集成徽章
components/CommentList.tsx                 # 修改：集成徽章
components/Avatar.tsx                      # 修改：支持 NFT
components/WalletBadge.tsx                 # 修改：添加点击事件
```

---

## 📋 Sprint 4B: 链上动态与打赏（计划中）

### 状态
可选功能，根据 Sprint 4A 完成情况决定是否实施。

### 功能规划

#### B2. 链上动态（建议独立 Sprint 5）
- [ ] 开发智能合约（Solidity）
- [ ] IPFS 内容存储
- [ ] 链上发文功能
- [ ] 链上验证标记
- [ ] Gas 费用管理

**技术挑战：**
- 需要智能合约开发
- 部署到测试网和主网
- Web3 交互逻辑复杂
- 预计时间：1-2 周

#### B3. 代币打赏（可选）
- [ ] MetaMask 转账集成
- [ ] 支持 ETH/USDC/USDT
- [ ] 打赏记录和历史
- [ ] 打赏排行榜
- [ ] 打赏通知

**预计时间：** 3 小时

---

## 📋 Sprint 5: 多链支持（计划中）

### 功能规划

#### 多链钱包连接
- [ ] 支持 Ethereum、BSC、Polygon、Arbitrum
- [ ] 链选择器 UI
- [ ] 多链地址管理
- [ ] 链切换功能

#### 跨链声誉聚合
- [ ] 聚合多链数据
- [ ] 综合声誉计算
- [ ] 各链贡献占比展示
- [ ] 跨链资产统计

#### 多链 DeFi 数据
- [ ] 扩展 DeFi 浏览器支持多链
- [ ] 跨链协议对比
- [ ] 多链收益率聚合

**预计时间：** 1 周

---

## 🎯 长期规划

### Phase 1: 社交功能完善（Q1 2025）
- [ ] 群组/频道功能
- [ ] 直播/Spaces 功能
- [ ] 私信系统
- [ ] 内容推荐算法

### Phase 2: Web3 深度集成（Q2 2025）
- [ ] DAO 治理功能
- [ ] 代币经济模型
- [ ] NFT 市场
- [ ] 链上身份系统

### Phase 3: 移动端和 PWA（Q3 2025）
- [ ] React Native 应用
- [ ] PWA 离线支持
- [ ] 推送通知
- [ ] 原生功能集成

### Phase 4: 国际化和扩展（Q4 2025）
- [ ] 多语言支持
- [ ] 全球 CDN 部署
- [ ] 性能优化
- [ ] 社区生态建设

---

## 📊 开发统计

### 已完成功能
- ✅ 核心社交功能：100%
- ✅ DeFi 集成：100%
- ✅ 钱包验证与声誉：100%
- 🔄 Web3 社交化：0%（Sprint 4A 进行中）

### 技术债务
- [ ] 优化图片存储（当前未使用 Supabase Storage）
- [ ] 添加单元测试
- [ ] 性能监控和日志系统
- [ ] SEO 优化

### 已知问题
- 无关键问题

---

## 🔧 开发环境

### 必需环境变量
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_ALCHEMY_API_KEY=oglrc_W8xnJbUcVhY5XqJ  # Sprint 4A 新增
```

### 可选环境变量
```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_MORALIS_API_KEY=xxx  # Alchemy 替代方案
```

---

## 📝 更新日志

### 2025-01-10
- ✅ 完成 Sprint 3（钱包验证与声誉系统）
- 🔄 开始 Sprint 4A（Web3 社交声誉系统）
- ✅ 创建项目路线图文档
- ✅ 数据库迁移（NFT 头像字段）
- ✅ 配置 Alchemy API Key

---

## 📞 联系与反馈

如有问题或建议，请提交 Issue 或联系项目维护者。

**🚀 持续更新中...**
