'use client'

import { useState } from 'react'
import Navbar from '@/components/Navbar'
import { Activity, CheckCircle, XCircle, Loader } from 'lucide-react'

export default function WebSocketTestPage() {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle')
  const [messages, setMessages] = useState<string[]>([])
  const [error, setError] = useState<string>('')
  const [ws, setWs] = useState<WebSocket | null>(null)

  const addMessage = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    setMessages(prev => [...prev, `[${timestamp}] ${msg}`])
  }

  const testConnection = () => {
    setStatus('connecting')
    setMessages([])
    setError('')
    addMessage('🔄 开始连接测试...')

    try {
      addMessage('📡 创建 WebSocket 连接到 Binance...')
      const wsUrl = 'wss://stream.binance.com:9443/ws/btcusdt@ticker'
      addMessage(`🌐 URL: ${wsUrl}`)

      const websocket = new WebSocket(wsUrl)
      setWs(websocket)

      websocket.onopen = () => {
        addMessage('✅ WebSocket 连接成功！')
        setStatus('connected')
      }

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          addMessage(`📥 收到数据: BTC/USDT = $${parseFloat(data.c).toFixed(2)}`)
        } catch (e) {
          addMessage(`⚠️ 解析数据失败: ${e}`)
        }
      }

      websocket.onerror = (event) => {
        addMessage('❌ WebSocket 错误发生')
        console.error('WebSocket error:', event)
        setStatus('error')
        setError('连接失败。可能原因：\n1. 网络问题\n2. 浏览器阻止 WebSocket\n3. Binance 服务不可用')
      }

      websocket.onclose = (event) => {
        addMessage(`🔌 连接关闭 (Code: ${event.code}, Reason: ${event.reason || '无'})`)
        if (status !== 'error') {
          setStatus('idle')
        }
      }

      // 5秒后如果还没连接上就超时
      setTimeout(() => {
        if (websocket.readyState !== WebSocket.OPEN) {
          addMessage('⏱️ 连接超时 (5秒)')
          websocket.close()
          setStatus('error')
          setError('连接超时')
        }
      }, 5000)
    } catch (e) {
      addMessage(`❌ 创建连接失败: ${e}`)
      setStatus('error')
      setError(e instanceof Error ? e.message : '未知错误')
    }
  }

  const disconnect = () => {
    if (ws) {
      addMessage('🔌 手动断开连接...')
      ws.close()
      setWs(null)
      setStatus('idle')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-500" />
            WebSocket 连接测试
          </h1>
          <p className="text-gray-600 text-sm mt-2">
            测试浏览器与 Binance WebSocket 的连接状态
          </p>
        </div>

        {/* 状态卡片 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">连接状态</h2>
            <div className="flex items-center gap-2">
              {status === 'idle' && (
                <span className="text-gray-500 text-sm">未连接</span>
              )}
              {status === 'connecting' && (
                <>
                  <Loader className="w-4 h-4 text-blue-500 animate-spin" />
                  <span className="text-blue-600 text-sm font-medium">连接中...</span>
                </>
              )}
              {status === 'connected' && (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-green-600 text-sm font-medium">已连接</span>
                </>
              )}
              {status === 'error' && (
                <>
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-red-600 text-sm font-medium">连接失败</span>
                </>
              )}
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex gap-2">
            <button
              onClick={testConnection}
              disabled={status === 'connecting' || status === 'connected'}
              className="px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'connecting' ? '连接中...' : '开始测试'}
            </button>
            {status === 'connected' && (
              <button
                onClick={disconnect}
                className="px-4 py-2 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition"
              >
                断开连接
              </button>
            )}
          </div>

          {/* 错误信息 */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-medium mb-1">错误信息：</p>
              <p className="text-xs text-red-700 whitespace-pre-line">{error}</p>
            </div>
          )}
        </div>

        {/* 日志 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">连接日志</h2>
          <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-xs">
            {messages.length === 0 ? (
              <p className="text-gray-500">点击"开始测试"查看连接日志...</p>
            ) : (
              <div className="space-y-1">
                {messages.map((msg, i) => (
                  <div key={i} className="text-green-400">
                    {msg}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 说明 */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">测试说明</h3>
          <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
            <li>此测试页面会尝试连接到 Binance 的 WebSocket 服务器</li>
            <li>如果连接成功，您会看到 BTC/USDT 的实时价格更新</li>
            <li>如果连接失败，请检查浏览器控制台的错误信息</li>
            <li>测试 URL: wss://stream.binance.com:9443/ws/btcusdt@ticker</li>
          </ul>
        </div>

        {/* 浏览器兼容性 */}
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">浏览器环境检测</h3>
          <div className="text-xs text-gray-700 space-y-1">
            <p>✓ User Agent: {typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}</p>
            <p>✓ WebSocket 支持: {typeof WebSocket !== 'undefined' ? '是' : '否'}</p>
            <p>✓ 当前协议: {typeof window !== 'undefined' ? window.location.protocol : 'N/A'}</p>
          </div>
        </div>
      </main>
    </div>
  )
}
