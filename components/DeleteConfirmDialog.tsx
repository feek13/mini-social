'use client'

import { AlertTriangle, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface DeleteConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  isDeleting?: boolean
}

export default function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = '删除动态',
  message = '确定要删除这条动态吗？删除后无法恢复。',
  confirmText = '删除',
  cancelText = '取消',
  isDeleting = false,
}: DeleteConfirmDialogProps) {
  const [isMounted, setIsMounted] = useState(false)

  // 确保在客户端环境
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // ESC 键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose()
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
      // 禁止背景滚动
      document.body.style.overflow = 'hidden'
      return () => {
        window.removeEventListener('keydown', handleEsc)
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen, onClose, isDeleting])

  if (!isOpen || !isMounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4 animate-fade-in">
      {/* 遮罩层 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !isDeleting && onClose()}
      />

      {/* 对话框 */}
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md sm:mx-4 animate-slide-up sm:animate-scale-up overflow-hidden z-[10000]">
        {/* 顶部装饰条 */}
        <div className="h-1 sm:h-1.5 bg-gradient-to-r from-red-500 to-pink-500" />

        {/* 内容 */}
        <div className="p-5 sm:p-6 pb-safe">
          {/* 图标和标题 */}
          <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-4">
            <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">
                {title}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {message}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 active:text-gray-700 transition-colors disabled:opacity-50 p-1 -mr-1"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 按钮组 */}
          <div className="flex items-center gap-3 mt-5 sm:mt-6">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-3 sm:py-2.5 rounded-lg sm:rounded-lg font-medium text-sm sm:text-base text-gray-700 bg-gray-100 active:bg-gray-200 sm:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-3 sm:py-2.5 rounded-lg sm:rounded-lg font-medium text-sm sm:text-base text-white bg-gradient-to-r from-red-500 to-red-600 active:from-red-600 active:to-red-700 sm:hover:from-red-600 sm:hover:to-red-700 shadow-md active:shadow-lg sm:hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] sm:active:scale-95"
            >
              {isDeleting ? '删除中...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
