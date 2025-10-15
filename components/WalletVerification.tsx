'use client'

/**
 * 钱包验证组件
 *
 * 功能：
 * 1. 显示当前连接的钱包地址
 * 2. 请求用户签名验证钱包所有权
 * 3. 将验证后的钱包地址绑定到用户账户
 * 4. 显示已绑定的钱包信息
 * 5. 支持解绑钱包
 */

import { useState, useEffect } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { CheckCircle, XCircle, Loader2, Wallet, Link as LinkIcon, Unlink } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import { generateVerificationMessage } from '@/lib/wallet-verification'

export default function WalletVerification() {
  const { user, profile } = useAuth()
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const [verifying, setVerifying] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [verifiedAddress, setVerifiedAddress] = useState<string | null>(null)

  // 加载已绑定的钱包地址
  useEffect(() => {
    if (profile?.wallet_address) {
      setVerifiedAddress(profile.wallet_address)
    }
  }, [profile])

  // 验证钱包
  const handleVerifyWallet = async () => {
    if (!address || !isConnected) {
      setError('请先连接钱包')
      return
    }

    if (!user || !profile) {
      setError('请先登录')
      return
    }

    setVerifying(true)
    setError(null)
    setSuccess(null)

    try {
      // 1. 生成待签名消息
      const message = generateVerificationMessage(address, profile.username)

      // 2. 请求用户签名
      const signature = await signMessageAsync({ message })

      // 3. 获取 session token
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('未找到会话信息')
      }

      // 4. 调用后端 API 验证签名
      const response = await fetch('/api/wallet/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          address,
          message,
          signature,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '验证失败')
      }

      // 5. 更新状态
      setVerifiedAddress(result.wallet_address)
      setSuccess('钱包验证成功！')

      // 6. 刷新页面以更新 profile
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (err) {
      console.error('钱包验证失败:', err)
      setError(err instanceof Error ? err.message : '钱包验证失败')
    } finally {
      setVerifying(false)
    }
  }

  // 解绑钱包
  const handleUnlinkWallet = async () => {
    if (!user) {
      setError('请先登录')
      return
    }

    if (
      !confirm('确定要解绑钱包吗？解绑后您的钱包声誉数据将被清除。')
    ) {
      return
    }

    setUnlinking(true)
    setError(null)
    setSuccess(null)

    try {
      // 获取 session token
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('未找到会话信息')
      }

      // 调用后端 API 解绑钱包
      const response = await fetch('/api/wallet/unlink', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '解绑失败')
      }

      // 更新状态
      setVerifiedAddress(null)
      setSuccess('钱包已成功解绑')

      // 刷新页面以更新 profile
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (err) {
      console.error('解绑钱包失败:', err)
      setError(err instanceof Error ? err.message : '解绑钱包失败')
    } finally {
      setUnlinking(false)
    }
  }

  // 格式化钱包地址（显示前6位和后4位）
  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center space-x-3 mb-4">
        <Wallet className="w-6 h-6 text-blue-500" />
        <h3 className="text-lg font-semibold text-gray-900">钱包验证</h3>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* 成功提示 */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-2">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* 已验证的钱包 */}
      {verifiedAddress ? (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">已绑定钱包</p>
                  <p className="text-lg font-mono font-semibold text-gray-900">
                    {formatAddress(verifiedAddress)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleUnlinkWallet}
            disabled={unlinking}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {unlinking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>解绑中...</span>
              </>
            ) : (
              <>
                <Unlink className="w-4 h-4" />
                <span>解绑钱包</span>
              </>
            )}
          </button>
        </div>
      ) : (
        /* 未验证状态 */
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600 mb-3">
              验证钱包地址后，您将获得以下功能：
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start space-x-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>基于链上活动的用户声誉评分</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>展示您的 DeFi 投资组合</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>参与钱包持有者专属活动</span>
              </li>
            </ul>
          </div>

          {/* 当前连接的钱包 */}
          {isConnected && address && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">当前连接的钱包</p>
              <p className="text-sm font-mono font-semibold text-gray-900">
                {formatAddress(address)}
              </p>
            </div>
          )}

          <button
            onClick={handleVerifyWallet}
            disabled={!isConnected || verifying}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {verifying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>验证中...</span>
              </>
            ) : !isConnected ? (
              <>
                <Wallet className="w-5 h-5" />
                <span>请先连接钱包</span>
              </>
            ) : (
              <>
                <LinkIcon className="w-5 h-5" />
                <span>验证并绑定钱包</span>
              </>
            )}
          </button>

          {!isConnected && (
            <p className="text-xs text-gray-500 text-center">
              点击右上角的"连接钱包"按钮开始
            </p>
          )}
        </div>
      )}
    </div>
  )
}
