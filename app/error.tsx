'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 记录错误到错误报告服务
    console.error('应用错误:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
        <div className="flex flex-col items-center">
          {/* 错误图标 */}
          <div className="w-16 h-16 mb-4 flex items-center justify-center bg-red-100 rounded-full">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* 错误标题 */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            出错了
          </h2>

          {/* 错误信息 */}
          <p className="text-gray-600 text-center mb-6">
            {error.message || '页面加载失败，请重试'}
          </p>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              重试
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              返回首页
            </button>
          </div>

          {/* 开发环境显示详细错误信息 */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-6 w-full">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                查看详细信息
              </summary>
              <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}
