'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Flame,
  Trophy,
  MessageCircle,
  Wallet,
  Star,
  Fuel,
  User,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import Avatar from '@/components/Avatar'
import Navbar from '@/components/Navbar'

/**
 * 移动端"更多"页面
 * 显示所有次要功能和设置选项
 */
export default function MorePage() {
  const { user, profile, loading, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
    router.refresh()
  }

  // 功能分类
  const sections = [
    {
      title: '发现',
      items: [
        {
          href: '/trending',
          icon: Flame,
          label: '热门动态',
          color: 'text-orange-500',
          bgColor: 'bg-orange-50',
        },
        {
          href: '/leaderboard',
          icon: Trophy,
          label: '排行榜',
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-50',
        },
      ],
    },
    {
      title: 'Web3 工具',
      items: [
        {
          href: '/wallet',
          icon: Wallet,
          label: '钱包分析',
          color: 'text-purple-500',
          bgColor: 'bg-purple-50',
        },
        {
          href: '/wallet/trackers',
          icon: Star,
          label: '钱包追踪',
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-50',
          requireAuth: true,
        },
        {
          href: '/gas',
          icon: Fuel,
          label: 'Gas 追踪器',
          color: 'text-green-500',
          bgColor: 'bg-green-50',
        },
      ],
    },
  ]

  // 用户相关功能（仅登录用户显示）
  const userSection = user
    ? {
        title: '账户',
        items: [
          {
            href: '/messages',
            icon: MessageCircle,
            label: '私信',
            color: 'text-blue-500',
            bgColor: 'bg-blue-50',
          },
          {
            href: `/profile/${profile?.username || user.email?.split('@')[0]}`,
            icon: User,
            label: '个人资料',
            color: 'text-gray-600',
            bgColor: 'bg-gray-50',
          },
          {
            href: '/profile/edit',
            icon: Settings,
            label: '设置',
            color: 'text-gray-600',
            bgColor: 'bg-gray-50',
          },
        ],
      }
    : null

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
        <div className="max-w-2xl mx-auto">
          {/* 顶部用户信息卡片（仅登录用户） */}
          {user && profile && (
            <Link
              href={`/profile/${profile.username}`}
              className="block bg-white border-b border-gray-200 p-6 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-4">
                <Avatar
                  username={profile.username}
                  avatarUrl={profile.avatar_url}
                  avatarTemplate={profile.avatar_template}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 truncate">
                    {profile.username}
                  </h2>
                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </Link>
          )}

          {/* 功能列表 */}
          <div className="divide-y divide-gray-200">
            {sections.map((section) => (
              <div key={section.title} className="bg-white">
                <h3 className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                  {section.title}
                </h3>
                <div className="divide-y divide-gray-100">
                  {section.items
                    .filter((item) => !item.requireAuth || user)
                    .map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                      >
                        <div className={`p-2 rounded-lg ${item.bgColor}`}>
                          <item.icon className={`w-5 h-5 ${item.color}`} />
                        </div>
                        <span className="flex-1 font-medium text-gray-900">
                          {item.label}
                        </span>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </Link>
                    ))}
                </div>
              </div>
            ))}

            {/* 用户账户部分 */}
            {userSection && (
              <div className="bg-white">
                <h3 className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                  {userSection.title}
                </h3>
                <div className="divide-y divide-gray-100">
                  {userSection.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    >
                      <div className={`p-2 rounded-lg ${item.bgColor}`}>
                        <item.icon className={`w-5 h-5 ${item.color}`} />
                      </div>
                      <span className="flex-1 font-medium text-gray-900">
                        {item.label}
                      </span>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 登出按钮（仅登录用户） */}
            {user && (
              <div className="bg-white">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-red-50 active:bg-red-100 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-red-50">
                    <LogOut className="w-5 h-5 text-red-500" />
                  </div>
                  <span className="flex-1 text-left font-medium text-red-600">
                    登出
                  </span>
                </button>
              </div>
            )}

            {/* 未登录提示 */}
            {!user && !loading && (
              <div className="bg-white p-6">
                <div className="text-center">
                  <p className="text-gray-600 mb-4">登录以访问更多功能</p>
                  <div className="flex gap-3 justify-center">
                    <Link
                      href="/login"
                      className="px-6 py-2 border border-gray-300 rounded-full font-medium text-gray-700 hover:bg-gray-50 transition"
                    >
                      登录
                    </Link>
                    <Link
                      href="/signup"
                      className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full font-medium hover:from-blue-600 hover:to-blue-700 transition shadow-sm"
                    >
                      注册
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
