'use client'

import { useRouter } from 'next/navigation'
import { Shield, AlertTriangle } from 'lucide-react'
import Navbar from '@/components/Navbar'

export default function InitAdminPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-gray-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">功能已禁用</h1>
            <p className="text-gray-600">
              此功能已在生产环境中禁用，以确保系统安全
            </p>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-3 text-base">如何添加管理员</p>
                <p className="mb-3">请通过 Supabase 后台添加管理员权限：</p>
                <ol className="list-decimal list-inside space-y-2 ml-2">
                  <li>登录 Supabase 项目后台</li>
                  <li>进入 Table Editor，选择 <code className="px-1.5 py-0.5 bg-blue-100 rounded text-blue-900 font-mono text-xs">profiles</code> 表</li>
                  <li>找到需要设置为管理员的用户</li>
                  <li>将 <code className="px-1.5 py-0.5 bg-blue-100 rounded text-blue-900 font-mono text-xs">is_admin</code> 字段设置为 <code className="px-1.5 py-0.5 bg-blue-100 rounded text-blue-900 font-mono text-xs">true</code></li>
                  <li>保存更改</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Admin Features */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">管理员权限包括</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span>查看和处理用户举报</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span>管理用户封禁</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span>管理敏感词列表</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span>查看审核操作记录</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span>访问管理员后台统计</span>
              </li>
            </ul>
          </div>

          {/* Back Button */}
          <button
            onClick={() => router.push('/')}
            className="w-full mt-6 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            返回首页
          </button>
        </div>
      </main>
    </div>
  )
}
