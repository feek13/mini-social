'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type AuthContextType = {
  user: User | null
  profile: {
    username: string
    avatar_url?: string
    avatar_template?: string
  } | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<{ username: string; avatar_url?: string; avatar_template?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 获取用户资料的辅助函数（带超时和 fallback）
    const fetchProfile = async (userId: string): Promise<{ username: string; avatar_url?: string; avatar_template?: string } | null> => {
      try {
        // 使用 Promise.race 实现 3 秒超时
        const profilePromise = supabase
          .from('profiles')
          .select('username, avatar_url, avatar_template')
          .eq('id', userId)
          .single()

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
        })

        const { data: profileData, error } = await Promise.race([
          profilePromise,
          timeoutPromise
        ])

        if (error) {
          console.warn('获取用户资料失败，使用默认配置:', error.message || error)
          return null
        }

        return profileData
      } catch {
        // 超时或网络问题，静默处理，使用 fallback
        console.warn('Profile 加载超时，使用默认配置')
        return null
      }
    }

    // 获取初始会话
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)

        if (session?.user) {
          // 尝试获取用户资料
          const profileData = await fetchProfile(session.user.id)

          // 如果无法获取 profile，使用 fallback
          if (!profileData) {
            const fallbackUsername = session.user.email?.split('@')[0] || 'user'
            setProfile({
              username: fallbackUsername,
              avatar_url: undefined,
              avatar_template: 'micah'
            })
          } else {
            setProfile(profileData)
          }
        }
      } catch (error) {
        console.error('获取会话错误:', error)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // 监听认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        // 尝试获取用户资料
        const profileData = await fetchProfile(session.user.id)

        // 如果无法获取 profile，使用 fallback
        if (!profileData) {
          const fallbackUsername = session.user.email?.split('@')[0] || 'user'
          setProfile({
            username: fallbackUsername,
            avatar_url: undefined,
            avatar_template: 'micah'
          })
        } else {
          setProfile(profileData)
        }
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
    } catch (error) {
      console.error('登出错误:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
