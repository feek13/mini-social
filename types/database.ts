// Profile 表（数据库中的表名）
export type Profile = {
  id: string
  email: string
  username: string
  avatar_url?: string
  avatar_template?: string  // 头像模版类型
  nft_avatar_url?: string   // NFT 头像 URL
  nft_contract_address?: string // NFT 合约地址
  nft_token_id?: string     // NFT Token ID
  bio?: string              // 个人简介
  location?: string         // 位置
  wallet_address?: string   // 已验证的钱包地址（小写）
  wallet_verified_at?: string // 钱包验证时间

  // 声誉系统字段
  reputation_score?: number // 声誉分数 (0-100)
  reputation_level?: string // 声誉等级 (Bronze/Silver/Gold/Diamond/Legend)
  reputation_updated_at?: string // 声誉最后更新时间
  on_chain_tx_count?: number // 链上交易总数
  defi_protocol_count?: number // 参与的 DeFi 协议数量
  wallet_age_days?: number // 钱包年龄（天数）
  eth_balance?: string // ETH 余额（Wei）

  created_at: string
}

// User 类型别名（为了兼容性）
export type User = Profile

export type Post = {
  id: string
  user_id: string
  content: string
  images?: string[]  // 图片 URL 数组
  likes_count: number
  comments_count?: number // 评论数量
  hot_score?: number // 热度分数（用于热门排序）
  repost_count: number // 转发数量
  is_repost: boolean // 是否为转发
  original_post_id?: string // 原动态ID
  repost_comment?: string // 转发时的评论
  link_preview?: LinkPreview // 链接预览数据
  created_at: string
  user?: Profile
  original_post?: Post // 原动态信息（嵌套）
  hashtags?: Hashtag[]       // 关联的话题标签
  mentions?: Mention[]       // 提及的用户
  defi_embeds?: DeFiEmbed[]  // DeFi 嵌入数据
}

// 链接预览类型
export type LinkPreview = {
  url: string
  title?: string
  description?: string
  image?: string
  siteName?: string
  favicon?: string
}

// DeFi 嵌入数据类型
export type DeFiEmbed = {
  id?: string
  post_id?: string
  embed_type: 'protocol' | 'token_price' | 'yield_pool' | 'chain'
  reference_id: string       // 协议slug/代币地址/池子ID/链名
  snapshot_data: Record<string, unknown>  // 快照数据（JSONB）
  created_at?: string
}

export type Comment = {
  id: string
  post_id: string
  user_id: string
  parent_comment_id?: string  // 父评论ID
  content: string
  reply_count: number          // 回复数量
  depth: number                // 层级深度
  created_at: string
  user?: Profile
  replies?: Comment[]          // 子评论（可选加载）
}

export type NotificationType = 'like' | 'comment' | 'repost' | 'follow' | 'new_post' | 'mention'

export type Notification = {
  id: string
  recipient_id: string
  sender_id: string
  type: NotificationType
  post_id?: string
  comment_id?: string
  is_read: boolean
  created_at: string

  // 关联数据
  sender?: Profile          // 发送者信息
  post?: Post              // 相关动态
  comment?: Comment        // 相关评论
}

// 关注关系类型
export type Follow = {
  follower_id: string      // 关注者ID
  following_id: string     // 被关注者ID
  notify_on_post: boolean  // 是否开启发文通知
  created_at: string

  follower?: Profile       // 关注者信息
  following?: Profile      // 被关注者信息
}

// 用户统计类型
export type UserStats = {
  postsCount: number
  likesCount: number
  commentsCount: number
  followersCount: number   // 粉丝数
  followingCount: number   // 关注数
  memberDays: number
}

// 话题标签类型
export type Hashtag = {
  id: string
  name: string              // 标签名（不含#）
  usage_count: number       // 使用次数
  created_at: string
}

// 动态-标签关联
export type PostHashtag = {
  post_id: string
  hashtag_id: string
  created_at: string
  hashtag?: Hashtag
}

// 提及类型
export type Mention = {
  id: string
  post_id?: string
  comment_id?: string
  mentioned_user_id: string
  mentioner_user_id: string
  created_at: string
  mentioned_user?: Profile
  mentioner_user?: Profile
}

// 声誉等级类型
export type ReputationLevel = 'Bronze' | 'Silver' | 'Gold' | 'Diamond' | 'Legend'

// 声誉历史记录类型
export type ReputationHistory = {
  id: string
  user_id: string
  score: number
  level: ReputationLevel

  // 各维度得分
  wallet_age_score: number
  activity_score: number
  defi_score: number
  asset_score: number
  social_score: number

  // 统计数据
  tx_count: number
  protocol_count: number
  wallet_age_days: number

  calculated_at: string
}

// 声誉概览类型（用于 API 返回）
export type ReputationSummary = {
  user_id: string
  username: string
  wallet_address?: string
  reputation_score: number
  reputation_level: ReputationLevel
  reputation_updated_at?: string
  on_chain_tx_count: number
  defi_protocol_count: number
  wallet_age_days: number
  rank: number // 排名
  score_breakdown?: {
    wallet_age_score: number
    activity_score: number
    defi_score: number
    asset_score: number
    social_score: number
  }
}

// =====================================================
// Sprint 5: 私信系统类型定义
// =====================================================

// 会话类型
export type ConversationType = 'direct' | 'group'

// 消息类型
export type MessageType = 'text' | 'image' | 'file'

// 会话表
export type Conversation = {
  id: string
  participant_ids: string[]
  conversation_type: ConversationType
  group_name?: string
  group_avatar_url?: string
  last_message_id?: string
  last_message_content?: string
  last_message_sender_id?: string
  last_message_at?: string
  created_at: string
  updated_at: string

  // 关联数据（可选）
  last_message_sender?: Profile
  participants?: Profile[]
  unread_count?: number
  is_muted?: boolean
  is_pinned?: boolean
}

// 消息表
export type Message = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  message_type: MessageType
  media_url?: string
  media_type?: string
  media_size?: number
  read_by?: Record<string, string> // { user_id: timestamp }
  is_deleted: boolean
  reply_to_message_id?: string
  created_at: string
  updated_at: string

  // 关联数据（可选）
  sender?: Profile
  reply_to_message?: Message
}

// 会话成员
export type ConversationMember = {
  conversation_id: string
  user_id: string
  unread_count: number
  last_read_message_id?: string
  is_muted: boolean
  is_pinned: boolean
  joined_at: string
  last_seen_at: string

  // 关联数据（可选）
  user?: Profile
}

// 会话列表视图（用于 API 返回）
export type ConversationListItem = {
  id: string
  conversation_type: ConversationType
  group_name?: string
  group_avatar_url?: string
  participant_ids: string[]
  last_message_content?: string
  last_message_at?: string
  created_at: string
  updated_at: string

  // 发送者信息
  last_message_sender_id?: string
  last_message_sender_username?: string
  last_message_sender_avatar_url?: string
  last_message_sender_avatar_template?: string
  last_message_sender_nft_avatar_url?: string

  // 当前用户的会话成员信息
  unread_count: number
  is_muted: boolean
  is_pinned: boolean
  last_seen_at: string

  // 额外计算的字段
  participants?: Profile[]
  other_participant?: Profile // 一对一会话中的对方
}

// 消息发送请求
export type SendMessageRequest = {
  conversation_id: string
  content: string
  message_type?: MessageType
  media_url?: string
  media_type?: string
  media_size?: number
  reply_to_message_id?: string
}

// 创建会话请求
export type CreateConversationRequest = {
  participant_ids: string[]
  conversation_type?: ConversationType
  group_name?: string
  group_avatar_url?: string
}

// Realtime 消息事件
export type RealtimeMessageEvent = {
  type: 'new_message' | 'message_deleted' | 'message_updated'
  message: Message
}

// Realtime 打字指示器事件
export type TypingIndicatorEvent = {
  conversation_id: string
  user_id: string
  username: string
  is_typing: boolean
}

// Realtime 在线状态事件
export type PresenceEvent = {
  user_id: string
  online: boolean
  last_seen?: string
}

// =====================================================
// Sprint 6: 内容审核系统类型定义
// =====================================================

// 管理员角色
export type AdminRole = 'admin' | 'moderator' | 'support'

// 管理员角色表
export type AdminRoleRecord = {
  id: string
  user_id: string
  role: AdminRole
  granted_by?: string
  granted_at: string
  permissions: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

// 举报类型
export type ReportType = 'post' | 'comment' | 'user' | 'message'

// 举报原因
export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'violence'
  | 'nudity'
  | 'misinformation'
  | 'copyright'
  | 'other'

// 举报状态
export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed'

// 举报记录
export type Report = {
  id: string
  reporter_id: string
  report_type: ReportType
  reported_post_id?: string
  reported_comment_id?: string
  reported_user_id?: string
  reported_message_id?: string
  reason: ReportReason
  description?: string
  status: ReportStatus
  reviewed_by?: string
  reviewed_at?: string
  resolution_note?: string
  created_at: string
  updated_at: string

  // 关联数据（可选）
  reporter?: Profile
  reviewer?: Profile
  reported_post?: Post
  reported_comment?: Comment
  reported_user?: Profile
}

// 审核操作类型
export type ModerationActionType =
  | 'warning'
  | 'content_removal'
  | 'temporary_ban'
  | 'permanent_ban'
  | 'account_suspension'
  | 'content_restore'
  | 'ban_lift'

// 审核操作记录
export type ModerationAction = {
  id: string
  moderator_id: string
  target_user_id: string
  target_post_id?: string
  target_comment_id?: string
  action_type: ModerationActionType
  reason: string
  related_report_id?: string
  ban_duration_days?: number
  ban_expires_at?: string
  created_at: string
  metadata?: Record<string, unknown>

  // 关联数据（可选）
  moderator?: Profile
  target_user?: Profile
  target_post?: Post
  target_comment?: Comment
  related_report?: Report
}

// 敏感词严重程度
export type BannedWordSeverity = 'low' | 'medium' | 'high' | 'critical'

// 敏感词分类
export type BannedWordCategory = 'profanity' | 'hate_speech' | 'spam' | 'violence' | 'other'

// 敏感词表
export type BannedWord = {
  id: string
  word: string
  severity: BannedWordSeverity
  category: BannedWordCategory
  replacement?: string
  is_regex: boolean
  is_active: boolean
  added_by?: string
  created_at: string
  updated_at: string
}

// 封禁类型
export type BanType = 'temporary' | 'permanent'

// 用户封禁记录
export type UserBan = {
  id: string
  user_id: string
  banned_by: string
  reason: string
  ban_type: BanType
  banned_at: string
  expires_at?: string
  is_active: boolean
  lifted_by?: string
  lifted_at?: string
  lift_reason?: string

  // 关联数据（可选）
  user?: Profile
  banned_by_user?: Profile
  lifted_by_user?: Profile
}

// 待处理举报统计
export type PendingReportsSummary = {
  report_type: ReportType
  reason: ReportReason
  count: number
  oldest_report: string
}

// 审核员工作负载
export type ModeratorWorkload = {
  user_id: string
  username?: string
  role: AdminRole
  actions_count: number
  last_action_at?: string
}

// 举报提交请求
export type CreateReportRequest = {
  report_type: ReportType
  reported_post_id?: string
  reported_comment_id?: string
  reported_user_id?: string
  reported_message_id?: string
  reason: ReportReason
  description?: string
}

// 审核操作请求
export type CreateModerationActionRequest = {
  target_user_id: string
  target_post_id?: string
  target_comment_id?: string
  action_type: ModerationActionType
  reason: string
  related_report_id?: string
  ban_duration_days?: number
}

// 举报审核请求
export type ResolveReportRequest = {
  report_id: string
  status: 'resolved' | 'dismissed'
  resolution_note?: string
  action?: CreateModerationActionRequest
}

// =====================================================
// Sprint 7: 钱包分析系统类型定义
// =====================================================

// 钱包追踪记录
export type WalletTracker = {
  id: string
  user_id: string
  wallet_address: string
  nickname?: string
  notes?: string
  tracked_at: string
  notification_enabled: boolean
  last_notified_at?: string
  created_at: string
  updated_at: string

  // 关联数据（可选）
  user?: Profile
  latest_snapshot?: WalletSnapshot
  labels?: WalletLabel[]
}

// 快照类型
export type SnapshotType = 'full' | 'quick'

// 钱包快照
export type WalletSnapshot = {
  id: string
  wallet_address: string
  snapshot_data: Record<string, unknown> // JSONB 存储完整钱包数据
  total_value_usd: number
  total_tokens: number
  total_nfts: number
  total_chains: number
  chains: string[]
  snapshot_type: SnapshotType
  expires_at?: string
  created_at: string
  metadata?: Record<string, unknown>
}

// 标签类型
export type WalletLabelType = 'asset_size' | 'behavior' | 'protocol' | 'profit' | 'risk'

// 钱包标签
export type WalletLabel = {
  id: string
  wallet_address: string
  label_type: WalletLabelType
  label_value: string // 如：whale, diamond_hands, aave_user
  label_display?: string // 显示文本（中英文）
  confidence: number // 0-1，标签置信度
  evidence?: Record<string, unknown> // 标签依据数据
  auto_generated: boolean
  created_at: string
  updated_at: string
}

// 钱包对比记录
export type WalletComparison = {
  id: string
  user_id: string
  wallet_addresses: string[]
  comparison_name?: string
  comparison_data?: Record<string, unknown>
  is_public: boolean
  created_at: string
  updated_at: string

  // 关联数据（可选）
  user?: Profile
  snapshots?: WalletSnapshot[]
}

// =====================================================
// Sprint 7: Moralis API 响应类型
// =====================================================

// Moralis 代币余额
export type MoralisTokenBalance = {
  token_address: string
  name: string
  symbol: string
  logo?: string
  thumbnail?: string
  decimals: number
  balance: string
  possible_spam: boolean
  verified_contract?: boolean
  balance_formatted?: string
  usd_price?: number
  usd_value?: number
  percentage_relative_to_total_supply?: number
}

// Moralis 原生余额
export type MoralisNativeBalance = {
  balance: string
  balance_formatted?: string
  usd_price?: number
  usd_value?: number
}

// Moralis NFT
export type MoralisNFT = {
  token_address: string
  token_id: string
  amount: string
  owner_of: string
  token_hash: string
  block_number_minted: string
  block_number: string
  contract_type: string
  name?: string
  symbol?: string
  token_uri?: string
  metadata?: string
  last_token_uri_sync?: string
  last_metadata_sync?: string
  minter_address?: string
  possible_spam: boolean
  verified_collection?: boolean
  floor_price?: number
  floor_price_usd?: number
  collection?: {
    name: string
    image?: string
    verified?: boolean
  }
}

// Moralis 交易记录
export type MoralisTransaction = {
  hash: string
  nonce: string
  transaction_index: string
  from_address: string
  to_address?: string
  value: string
  gas?: string
  gas_price: string
  input: string
  receipt_cumulative_gas_used: string
  receipt_gas_used: string
  receipt_contract_address?: string
  receipt_status: string
  block_timestamp: string
  block_number: string
  block_hash: string
  transfer_index?: number[]
  logs?: unknown[]
}

// =====================================================
// Sprint 7: 钱包分析 API 请求/响应类型
// =====================================================

// 创建钱包追踪请求
export type CreateWalletTrackerRequest = {
  wallet_address: string
  nickname?: string
  notes?: string
  notification_enabled?: boolean
}

// 更新钱包追踪请求
export type UpdateWalletTrackerRequest = {
  nickname?: string
  notes?: string
  notification_enabled?: boolean
}

// 钱包概览响应
export type WalletOverviewResponse = {
  wallet_address: string
  total_value_usd: number
  native_balance: MoralisNativeBalance
  tokens: MoralisTokenBalance[]
  nfts_count: number
  chains: Array<{
    chain: string
    balance_usd: number
    tokens_count: number
  }>
  labels: WalletLabel[]
  tracker_count: number // 被追踪次数
  is_tracked_by_me: boolean
  last_updated: string
}

// 钱包交易历史响应
export type WalletTransactionsResponse = {
  wallet_address: string
  transactions: MoralisTransaction[]
  total: number
  page: number
  page_size: number
}

// 钱包持仓分析
export type WalletHoldingsAnalysis = {
  wallet_address: string
  total_value_usd: number
  token_count: number
  nft_count: number
  top_holdings: Array<{
    symbol: string
    name: string
    value_usd: number
    percentage: number
    chain: string
  }>
  chain_distribution: Array<{
    chain: string
    value_usd: number
    percentage: number
  }>
  risk_assessment?: {
    spam_tokens: number
    unverified_contracts: number
    risk_score: number // 0-100
  }
}

// 钱包盈亏分析（需要历史快照）
export type WalletProfitLossAnalysis = {
  wallet_address: string
  period: '7d' | '30d' | '90d' | 'all'
  total_profit_usd: number
  total_loss_usd: number
  net_profit_usd: number
  roi_percentage: number
  win_rate: number // 盈利交易占比
  best_trade?: {
    token: string
    profit_usd: number
    timestamp: string
  }
  worst_trade?: {
    token: string
    loss_usd: number
    timestamp: string
  }
  profit_by_token: Array<{
    token: string
    realized_profit_usd: number
    unrealized_profit_usd: number
  }>
}

// 钱包对比请求
export type CreateWalletComparisonRequest = {
  wallet_addresses: string[]
  comparison_name?: string
  is_public?: boolean
}

// 钱包对比响应
export type WalletComparisonResponse = {
  id: string
  wallet_addresses: string[]
  comparison_name?: string
  wallets: Array<{
    address: string
    total_value_usd: number
    token_count: number
    nft_count: number
    chains: string[]
    labels: WalletLabel[]
  }>
  comparison_summary: {
    total_value_range: [number, number]
    avg_value_usd: number
    common_tokens: string[]
    common_chains: string[]
  }
  created_at: string
  is_public: boolean
}

// 支持的 EVM 链类型
export type EvmChain =
  | 'ethereum'
  | 'bsc'
  | 'polygon'
  | 'arbitrum'
  | 'optimism'
  | 'base'
  | 'avalanche'
  | 'fantom'
  | 'cronos'
  | 'gnosis'
  | 'linea'
  | 'zksync'

// 链配置
export type ChainConfig = {
  id: EvmChain
  name: string
  rpc_url?: string
  explorer_url: string
  native_token: {
    symbol: string
    decimals: number
  }
  moralis_chain_id: string // Moralis API 使用的链 ID
}
