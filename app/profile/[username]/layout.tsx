import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

// 获取用户信息
async function getUserProfile(username: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()

    if (error || !data) {
      return null
    }

    return data
  } catch {
    return null
  }
}

// 生成动态元数据
export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  const profile = await getUserProfile(username)

  if (!profile) {
    return {
      title: '用户不存在 - MiniSocial',
      description: '该用户不存在或已被删除'
    }
  }

  const title = `@${profile.username} - MiniSocial`
  const description = profile.bio || `查看 @${profile.username} 在 MiniSocial 上的动态、关注和粉丝`
  const url = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/profile/${username}`

  // 生成头像 URL（如果使用 DiceBear）
  let avatarUrl = profile.avatar_url
  if (!avatarUrl && profile.avatar_template) {
    avatarUrl = `https://api.dicebear.com/7.x/${profile.avatar_template}/svg?seed=${encodeURIComponent(profile.username)}`
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'MiniSocial',
      images: avatarUrl ? [
        {
          url: avatarUrl,
          width: 400,
          height: 400,
          alt: `${profile.username} 的头像`,
        },
      ] : [],
      type: 'profile',
      locale: 'zh_CN',
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: avatarUrl ? [avatarUrl] : [],
    },
  }
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
