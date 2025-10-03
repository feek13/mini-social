'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut, Search as SearchIcon, X, Flame } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import Avatar from '@/components/Avatar'
import SearchBar from '@/components/SearchBar'
import NotificationBell from '@/components/NotificationBell'

export default function Navbar() {
  const { user, profile, loading, signOut } = useAuth()
  const router = useRouter()
  const [showMobileSearch, setShowMobileSearch] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 移动端搜索全屏模式 */}
        {showMobileSearch && (
          <div className="md:hidden fixed inset-0 bg-white z-50 flex flex-col">
            <div className="flex items-center h-16 px-4 gap-3 border-b border-gray-200">
              <SearchBar />
              <button
                onClick={() => setShowMobileSearch(false)}
                className="flex-shrink-0 p-2 text-gray-600 hover:text-gray-900"
              >
                <X size={24} />
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center h-16 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center group flex-shrink-0">
            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent group-hover:from-blue-600 group-hover:to-blue-700 transition-all">
              MiniSocial
            </span>
          </Link>

          {/* 搜索框（桌面端） */}
          <div className="hidden md:flex flex-1 max-w-md">
            <SearchBar />
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-3 sm:space-x-4 flex-shrink-0">
            {/* 移动端搜索图标 */}
            <button
              onClick={() => setShowMobileSearch(true)}
              className="md:hidden p-2 text-gray-600 hover:text-blue-500 transition"
              aria-label="搜索"
            >
              <SearchIcon size={20} />
            </button>

            {/* 热门动态链接 */}
            <Link
              href="/trending"
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 rounded-full text-gray-600 hover:text-orange-500 hover:bg-orange-50 transition-all group"
            >
              <Flame className="w-4 h-4 sm:w-5 sm:h-5 group-hover:animate-pulse" />
              <span className="hidden sm:inline text-sm font-medium">热门</span>
            </Link>

            {/* 通知图标 */}
            {user && <NotificationBell />}
            {loading ? (
              // 加载状态
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full shimmer"></div>
                <div className="h-9 w-16 rounded-full shimmer hidden sm:block"></div>
              </div>
            ) : user ? (
              // 已登录状态
              <div className="flex items-center space-x-3 animate-fade-in">
                <Link
                  href={`/profile/${profile?.username || user.email?.split('@')[0]}`}
                  className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition group"
                >
                  <Avatar
                    username={profile?.username}
                    avatarUrl={profile?.avatar_url}
                    avatarTemplate={profile?.avatar_template}
                    size="sm"
                    className="group-hover:ring-2 group-hover:ring-blue-500 group-hover:ring-offset-2 transition"
                  />
                  <span className="text-gray-700 font-medium text-sm sm:text-base hidden sm:inline-block max-w-[120px] truncate group-hover:text-blue-500 transition">
                    {profile?.username || user.email?.split('@')[0]}
                  </span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-3 py-2 sm:px-4 rounded-full font-medium hover:bg-gray-200 active:scale-95 transition-all shadow-sm hover:shadow"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline">登出</span>
                </button>
              </div>
            ) : (
              // 未登录状态
              <div className="flex items-center space-x-2 sm:space-x-3 animate-fade-in">
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-blue-500 font-medium transition text-sm sm:text-base px-2 sm:px-0"
                >
                  登录
                </Link>
                <Link
                  href="/signup"
                  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-2 sm:px-4 rounded-full font-semibold hover:from-blue-600 hover:to-blue-700 active:scale-95 transition-all shadow-md hover:shadow-lg text-sm sm:text-base"
                >
                  注册
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
