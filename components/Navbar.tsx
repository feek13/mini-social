'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  LogOut,
  Search as SearchIcon,
  X,
  Flame,
  TrendingUp,
  Trophy,
  MessageCircle,
  Wallet,
  Star,
  MoreHorizontal,
  User,
  Settings,
  ChevronDown,
  Fuel,
} from 'lucide-react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAuth } from '@/app/providers/AuthProvider'
import Avatar from '@/components/Avatar'
import SearchBar from '@/components/SearchBar'
import NotificationBell from '@/components/NotificationBell'
import GasTracker from '@/components/GasTracker'

/**
 * X/Twitter 风格的导航栏
 * - 移动端：顶部简洁栏（用户头像 + Logo）+ 底部标签栏（由 MobileBottomNav 组件负责）
 * - 桌面端：完整导航栏
 */
export default function Navbar() {
  const { user, profile, loading, signOut } = useAuth()
  const router = useRouter()
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
    router.refresh()
  }

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 导航项配置
  const primaryNavItems = [
    { href: '/trending', icon: Flame, label: '热门', color: 'orange' },
    { href: '/leaderboard', icon: Trophy, label: '排行榜', color: 'yellow' },
    { href: '/messages', icon: MessageCircle, label: '私信', color: 'purple', showWhen: 'authenticated' },
  ]

  const web3NavItems = [
    { href: '/defi', icon: TrendingUp, label: 'DeFi 数据', color: 'blue', showWhen: 'always' },
    { href: '/wallet', icon: Wallet, label: '钱包分析', color: 'purple', showWhen: 'always' },
    { href: '/wallet/trackers', icon: Star, label: '钱包追踪', color: 'yellow', showWhen: 'authenticated' },
    { href: '/gas', icon: Fuel, label: 'Gas 追踪', color: 'green', showWhen: 'always', isGasTracker: true },
  ]

  return (
    <>
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
            {/* 移动端：用户头像 + Logo */}
            <div className="flex items-center gap-3 md:hidden">
              {user ? (
                <Link href={`/profile/${profile?.username || user.email?.split('@')[0]}`}>
                  <Avatar
                    username={profile?.username}
                    avatarUrl={profile?.avatar_url}
                    avatarTemplate={profile?.avatar_template}
                    size="sm"
                    className="hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 transition"
                  />
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="text-sm font-medium text-blue-500 hover:text-blue-600 transition"
                >
                  登录
                </Link>
              )}

              <Link href="/" className="flex items-center">
                <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                  MiniSocial
                </span>
              </Link>
            </div>

            {/* 桌面端：Logo */}
            <Link href="/" className="hidden md:flex items-center group flex-shrink-0">
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent group-hover:from-blue-600 group-hover:to-blue-700 transition-all">
                MiniSocial
              </span>
            </Link>

          {/* 搜索框（桌面端） */}
          <div className="hidden md:flex flex-1 max-w-md">
            <SearchBar />
          </div>

          {/* 桌面端导航 */}
          <div className="hidden lg:flex items-center space-x-2">
            {/* 主要导航 */}
            {primaryNavItems.map((item) => {
              if (item.showWhen === 'authenticated' && !user) return null
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center space-x-2 px-3 py-2 rounded-full text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all group"
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              )
            })}

            {/* "Web3"下拉菜单 */}
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="flex items-center space-x-2 px-3 py-2 rounded-full text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all font-medium"
              >
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Web3</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${showMoreMenu ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Web3 下拉菜单 */}
              {showMoreMenu && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Web3 工具
                    </p>
                  </div>
                  {web3NavItems.map((item) => {
                    if (item.showWhen === 'authenticated' && !user) return null

                    // Gas Tracker 特殊处理：显示组件而非链接
                    if (item.isGasTracker) {
                      return (
                        <div key="gas-tracker" className="px-4 py-2">
                          <GasTracker />
                        </div>
                      )
                    }

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setShowMoreMenu(false)}
                        className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all"
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 右侧工具栏 */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* 移动端：搜索图标 */}
            <button
              onClick={() => setShowMobileSearch(true)}
              className="md:hidden p-2 text-gray-600 hover:text-blue-500 transition rounded-lg hover:bg-gray-100"
              aria-label="搜索"
            >
              <SearchIcon size={22} />
            </button>

            {/* 通知图标（移动端和桌面端都显示） */}
            {user && <NotificationBell />}

            {/* 钱包连接按钮（桌面端显示完整版，移动端显示简化版） */}
            {user && (
              <ConnectButton.Custom>
                {({
                  account,
                  chain,
                  openAccountModal,
                  openChainModal,
                  openConnectModal,
                  mounted,
                }) => {
                  const ready = mounted
                  const connected = ready && account && chain

                  return (
                    <div
                      {...(!ready && {
                        'aria-hidden': true,
                        'style': {
                          opacity: 0,
                          pointerEvents: 'none',
                          userSelect: 'none',
                        },
                      })}
                    >
                      {(() => {
                        if (!connected) {
                          return (
                            <>
                              {/* 桌面端：完整按钮 */}
                              <button
                                onClick={openConnectModal}
                                className="hidden md:inline-flex px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full font-medium hover:from-blue-600 hover:to-blue-700 active:scale-95 transition-all shadow-sm text-sm"
                              >
                                连接钱包
                              </button>
                              {/* 移动端：图标按钮 */}
                              <button
                                onClick={openConnectModal}
                                className="md:hidden p-2 text-gray-600 hover:text-blue-500 transition rounded-lg hover:bg-gray-100"
                                aria-label="连接钱包"
                              >
                                <Wallet size={22} />
                              </button>
                            </>
                          )
                        }

                        return (
                          <>
                            {/* 桌面端：完整显示 */}
                            <button
                              onClick={openAccountModal}
                              className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-all text-sm font-medium text-gray-700"
                            >
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500" />
                              <span className="font-mono">
                                {account.displayName}
                              </span>
                            </button>
                            {/* 移动端：仅显示彩色圆点 */}
                            <button
                              onClick={openAccountModal}
                              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
                              aria-label="钱包已连接"
                            >
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500" />
                            </button>
                          </>
                        )
                      })()}
                    </div>
                  )
                }}
              </ConnectButton.Custom>
            )}

            {loading ? (
              // 加载状态
              <div className="hidden md:flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full shimmer"></div>
              </div>
            ) : user ? (
              // 桌面端：用户下拉菜单
              <div className="relative hidden lg:block" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 hover:opacity-80 transition group"
                >
                  <Avatar
                    username={profile?.username}
                    avatarUrl={profile?.avatar_url}
                    avatarTemplate={profile?.avatar_template}
                    size="sm"
                    className="group-hover:ring-2 group-hover:ring-blue-500 group-hover:ring-offset-2 transition"
                  />
                  <ChevronDown
                    className={`w-3 h-3 text-gray-600 transition-transform ${
                      showUserMenu ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* 用户下拉菜单 */}
                {showUserMenu && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                    {/* 用户信息 */}
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="font-medium text-gray-900 truncate">
                        {profile?.username || user.email?.split('@')[0]}
                      </p>
                      <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    </div>

                    {/* 菜单项 */}
                    <Link
                      href={`/profile/${profile?.username || user.email?.split('@')[0]}`}
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition"
                    >
                      <User className="w-4 h-4" />
                      <span className="text-sm font-medium">个人资料</span>
                    </Link>

                    <Link
                      href="/profile/edit"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="text-sm font-medium">设置</span>
                    </Link>

                    <div className="border-t border-gray-200 my-2" />

                    <button
                      onClick={() => {
                        handleSignOut()
                        setShowUserMenu(false)
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-2 text-red-600 hover:bg-red-50 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm font-medium">登出</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // 桌面端：未登录状态
              <div className="hidden md:flex items-center space-x-2 sm:space-x-3 animate-fade-in">
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-blue-500 font-medium transition text-sm sm:text-base"
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
    </>
  )
}
