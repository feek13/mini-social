'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Avatar from '@/components/Avatar'
import AvatarSelector from '@/components/AvatarSelector'
import { useAuth } from '@/app/providers/AuthProvider'
import { supabase } from '@/lib/supabase'

interface ProfileData {
  id: string
  username: string
  email: string
  avatar_url?: string
  avatar_template?: string
  bio?: string
  location?: string
  created_at: string
}

export default function EditProfilePage() {
  const router = useRouter()
  const { user } = useAuth()

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    avatar_template: '',
    bio: '',
    location: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // 加载用户资料
  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    const loadProfile = async () => {
      try {
        setLoading(true)
        setError('')

        // 获取 access token
        const { data: { session } } = await supabase.auth.getSession()
        const accessToken = session?.access_token

        if (!accessToken) {
          router.push('/login')
          return
        }

        // 调用 GET /api/profile 获取当前用户资料
        const response = await fetch('/api/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || '获取资料失败')
        }

        setProfile(result.profile)
        setFormData({
          username: result.profile.username || '',
          avatar_template: result.profile.avatar_template || '',
          bio: result.profile.bio || '',
          location: result.profile.location || '',
        })
      } catch (err) {
        console.error('加载资料错误:', err)
        setError(err instanceof Error ? err.message : '加载失败，请刷新重试')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [user, router])

  // 表单验证
  const validateForm = (): string | null => {
    if (!formData.username || formData.username.trim().length < 3) {
      return '用户名至少需要 3 个字符'
    }
    if (formData.username.trim().length > 20) {
      return '用户名最多 20 个字符'
    }
    if (formData.bio.length > 160) {
      return '个人简介不能超过 160 个字符'
    }
    if (formData.location.length > 50) {
      return '所在地不能超过 50 个字符'
    }
    return null
  }

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // 验证表单
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setSaving(true)
      setError('')

      // 获取 access token
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '更新失败')
      }

      // 更新成功，跳转到个人主页
      router.push(`/profile/${formData.username}`)
    } catch (err) {
      console.error('保存资料错误:', err)
      setError(err instanceof Error ? err.message : '保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  // 计算剩余可输入字符
  const bioRemaining = 160 - formData.bio.length
  const locationRemaining = 50 - formData.location.length

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* 顶部导航 */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition group text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
            <span>返回</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-3 sm:mt-4">编辑个人资料</h1>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600">加载中...</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:p-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 sm:px-4 sm:py-3 rounded-lg mb-4 sm:mb-6 text-sm sm:text-base">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 max-w-[600px] mx-auto">
              {/* 1. 当前头像大预览 (移动端 120×120px, 平板/桌面 150×150px) */}
              <div className="flex flex-col items-center">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-3 sm:mb-4 text-center">
                  当前头像预览
                </label>
                <div className="relative">
                  <Avatar
                    username={formData.username || profile?.username}
                    avatarUrl={profile?.avatar_url}
                    avatarTemplate={formData.avatar_template}
                    size="xl"
                    className="!w-[120px] !h-[120px] sm:!w-[150px] sm:!h-[150px] ring-4 ring-white shadow-xl"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 sm:mt-3 text-center">
                  {formData.username || '用户名'}
                </p>
              </div>

              {/* 2. AvatarSelector */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-3 sm:mb-4">
                  选择头像风格
                </label>
                <AvatarSelector
                  username={formData.username || profile?.username || 'user'}
                  selectedTemplate={formData.avatar_template}
                  onSelect={(templateId) =>
                    setFormData((prev) => ({ ...prev, avatar_template: templateId }))
                  }
                />
              </div>

              {/* 3. 用户名输入 */}
              <div>
                <label htmlFor="username" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  用户名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, username: e.target.value }))
                  }
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="输入用户名"
                  required
                  minLength={3}
                  maxLength={20}
                />
                <p className="mt-1 text-xs text-gray-500">3-20 个字符</p>
              </div>

              {/* 4. 个人简介输入 (多行，带字符计数) */}
              <div>
                <label htmlFor="bio" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  个人简介
                </label>
                <textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, bio: e.target.value }))
                  }
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition"
                  placeholder="介绍一下自己..."
                  rows={4}
                  maxLength={160}
                />
                <p className={`mt-1 text-xs text-right ${bioRemaining < 20 ? 'text-red-500' : 'text-gray-500'}`}>
                  还可输入 {bioRemaining} 字
                </p>
              </div>

              {/* 5. 所在地输入 */}
              <div>
                <label htmlFor="location" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  所在地
                </label>
                <input
                  type="text"
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, location: e.target.value }))
                  }
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="你在哪里？"
                  maxLength={50}
                />
                <p className={`mt-1 text-xs text-right ${locationRemaining < 10 ? 'text-red-500' : 'text-gray-500'}`}>
                  还可输入 {locationRemaining} 字
                </p>
              </div>

              {/* 6. 保存按钮 */}
              <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => router.back()}
                  disabled={saving}
                  className="px-4 py-2 sm:px-6 sm:py-2.5 text-sm sm:text-base text-gray-700 hover:text-gray-900 transition disabled:opacity-50 font-medium"
                >
                  取消
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center space-x-1.5 sm:space-x-2 bg-blue-500 text-white px-4 py-2 sm:px-6 sm:py-2.5 text-sm sm:text-base rounded-lg font-medium hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-95"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      <span>保存中...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>保存更改</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
