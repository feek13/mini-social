'use client'

import { useState } from 'react'
import { Flag, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { ReportType, ReportReason } from '@/types/database'

type Props = {
  reportType: ReportType
  targetId: string
  className?: string
  iconOnly?: boolean  // 仅显示图标，不显示文字
}

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: '垃圾信息' },
  { value: 'harassment', label: '骚扰' },
  { value: 'hate_speech', label: '仇恨言论' },
  { value: 'violence', label: '暴力内容' },
  { value: 'nudity', label: '色情内容' },
  { value: 'misinformation', label: '虚假信息' },
  { value: 'copyright', label: '版权侵犯' },
  { value: 'other', label: '其他' },
]

export default function ReportButton({ reportType, targetId, className = '', iconOnly = false }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [reason, setReason] = useState<ReportReason | ''>('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!reason || submitting) return

    try {
      setSubmitting(true)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        alert('请先登录')
        return
      }

      const reportData: any = {
        report_type: reportType,
        reason,
        description: description.trim() || undefined,
      }

      // 根据类型设置目标ID
      switch (reportType) {
        case 'post':
          reportData.reported_post_id = targetId
          break
        case 'comment':
          reportData.reported_comment_id = targetId
          break
        case 'user':
          reportData.reported_user_id = targetId
          break
        case 'message':
          reportData.reported_message_id = targetId
          break
      }

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '举报失败')
      }

      setSubmitted(true)
      setTimeout(() => {
        setShowModal(false)
        setReason('')
        setDescription('')
        setSubmitted(false)
      }, 2000)
    } catch (error) {
      console.error('[ReportButton] 错误:', error)
      alert(error instanceof Error ? error.message : '举报失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* 举报按钮 */}
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center ${iconOnly ? '' : 'space-x-1'} text-gray-500 hover:text-red-600 transition-colors ${className}`}
        title="举报"
      >
        <Flag className="w-4 h-4" />
        {!iconOnly && <span className="text-sm">举报</span>}
      </button>

      {/* 举报模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* 头部 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {submitted ? '举报成功' : '举报内容'}
              </h2>
              {!submitted && (
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {submitted ? (
              /* 成功状态 */
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-700 dark:text-gray-300">
                  感谢您的举报，我们会尽快处理
                </p>
              </div>
            ) : (
              /* 举报表单 */
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                {/* 举报原因 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    举报原因 *
                  </label>
                  <div className="space-y-2">
                    {REPORT_REASONS.map((r) => (
                      <label
                        key={r.value}
                        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="reason"
                          value={r.value}
                          checked={reason === r.value}
                          onChange={(e) => setReason(e.target.value as ReportReason)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-gray-700 dark:text-gray-300">{r.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 详细说明 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    详细说明（选填）
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="请描述具体问题..."
                    rows={4}
                    maxLength={500}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                    {description.length} / 500
                  </div>
                </div>

                {/* 提交按钮 */}
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={!reason || submitting}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? '提交中...' : '提交举报'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
