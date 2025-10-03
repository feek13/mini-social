// Profile 表（数据库中的表名）
export type Profile = {
  id: string
  email: string
  username: string
  avatar_url?: string
  avatar_template?: string  // 头像模版类型
  bio?: string              // 个人简介
  location?: string         // 位置
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
  created_at: string
  user?: Profile
  original_post?: Post // 原动态信息（嵌套）
}

export type Comment = {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  user?: Profile
}

export type NotificationType = 'like' | 'comment' | 'repost' | 'follow' | 'new_post'

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
