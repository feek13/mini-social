'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Search, TrendingUp, Menu } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'

/**
 * X/Twitter 风格的移动端底部导航栏
 * 显示 4 个主要功能：首页、搜索、DeFi、更多
 */
export default function MobileBottomNav() {
  const { user } = useAuth()
  const pathname = usePathname()

  // 主要导航项（始终显示）
  const navItems = [
    {
      href: '/',
      icon: Home,
      label: '首页',
      activeCondition: (path: string) => path === '/',
    },
    {
      href: '/search',
      icon: Search,
      label: '搜索',
      activeCondition: (path: string) => path.startsWith('/search'),
    },
    {
      href: '/defi',
      icon: TrendingUp,
      label: 'DeFi',
      activeCondition: (path: string) => path.startsWith('/defi'),
    },
    {
      href: '/more',
      icon: Menu,
      label: '更多',
      activeCondition: (path: string) =>
        path.startsWith('/more') ||
        path.startsWith('/messages') ||
        path.startsWith('/trending') ||
        path.startsWith('/leaderboard') ||
        path.startsWith('/wallet') ||
        path.startsWith('/gas') ||
        (path.startsWith('/profile') && user && path.includes(user.email?.split('@')[0] || '')) ||
        path.startsWith('/profile/edit'),
    },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = item.activeCondition(pathname)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? 'text-blue-500'
                  : 'text-gray-600 hover:text-gray-900 active:bg-gray-100'
              }`}
            >
              <Icon
                size={24}
                strokeWidth={isActive ? 2.5 : 2}
                className={isActive ? 'fill-blue-500' : ''}
              />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
