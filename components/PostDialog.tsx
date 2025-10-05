'use client'

import { useState, useEffect, useRef, Fragment } from 'react'
import { X, Image as ImageIcon, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { useAuth } from '@/app/providers/AuthProvider'
import Avatar from '@/components/Avatar'
import { uploadImage, validateImageFile } from '@/lib/uploadImage'

interface PostDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (content: string, imageUrls?: string[]) => Promise<void>
}

const MAX_CHARACTERS = 280
const MAX_IMAGES = 9

export default function PostDialog({ isOpen, onClose, onSubmit }: PostDialogProps) {
  const { user, profile, loading: authLoading } = useAuth()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 图片相关状态
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dragCounterRef = useRef(0)

  const remainingChars = MAX_CHARACTERS - content.length
  const isValid = (content.trim().length > 0 || selectedImages.length > 0) && remainingChars >= 0

  // 对话框打开时自动聚焦
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      // 延迟一下让动画完成
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // ESC 键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
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
  }, [isOpen, onClose, loading])

  // 关闭时重置状态
  useEffect(() => {
    if (!isOpen) {
      // 清理预览 URL
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url))

      // 重置所有状态
      setContent('')
      setSelectedImages([])
      setImagePreviewUrls([])
      setError('')
      dragCounterRef.current = 0
      setIsDragging(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // 处理图片选择
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remainingSlots = MAX_IMAGES - selectedImages.length

    if (files.length === 0) return

    const filesToAdd = files.slice(0, remainingSlots)
    const validFiles: File[] = []

    for (const file of filesToAdd) {
      const validation = validateImageFile(file)
      if (!validation.valid) {
        setError(validation.error || '图片验证失败')
        setTimeout(() => setError(''), 3000)
        continue
      }
      validFiles.push(file)
    }

    if (validFiles.length === 0) return

    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file))
    setSelectedImages(prev => [...prev, ...validFiles])
    setImagePreviewUrls(prev => [...prev, ...newPreviewUrls])

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 删除图片
  const handleRemoveImage = (index: number) => {
    URL.revokeObjectURL(imagePreviewUrls[index])
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  // 处理粘贴上传图片
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items)
    const imageItems = items.filter(item => item.type.startsWith('image/'))

    if (imageItems.length === 0) return
    if (selectedImages.length >= MAX_IMAGES) {
      setError('最多只能上传 9 张图片')
      setTimeout(() => setError(''), 3000)
      return
    }

    e.preventDefault()

    const remainingSlots = MAX_IMAGES - selectedImages.length
    const itemsToProcess = imageItems.slice(0, remainingSlots)
    const validFiles: File[] = []
    const newPreviewUrls: string[] = []

    itemsToProcess.forEach(item => {
      const file = item.getAsFile()
      if (!file) return

      const validation = validateImageFile(file)
      if (!validation.valid) {
        setError(validation.error || '图片验证失败')
        setTimeout(() => setError(''), 3000)
        return
      }

      validFiles.push(file)
      newPreviewUrls.push(URL.createObjectURL(file))
    })

    if (validFiles.length > 0) {
      setSelectedImages(prev => [...prev, ...validFiles])
      setImagePreviewUrls(prev => [...prev, ...newPreviewUrls])
    }
  }

  // 拖拽处理
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (selectedImages.length >= MAX_IMAGES || loading) return

    dragCounterRef.current++
    if (dragCounterRef.current === 1) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    dragCounterRef.current--
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (selectedImages.length >= MAX_IMAGES || loading) {
      e.dataTransfer.dropEffect = 'none'
      return
    }
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    dragCounterRef.current = 0
    setIsDragging(false)

    if (selectedImages.length >= MAX_IMAGES || loading) return

    const remainingSlots = MAX_IMAGES - selectedImages.length
    const validFiles: File[] = []
    const newPreviewUrls: string[] = []

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    )

    if (files.length > 0) {
      const filesToAdd = files.slice(0, remainingSlots)

      for (const file of filesToAdd) {
        const validation = validateImageFile(file)
        if (!validation.valid) {
          setError(validation.error || '图片验证失败')
          setTimeout(() => setError(''), 3000)
          continue
        }
        validFiles.push(file)
        newPreviewUrls.push(URL.createObjectURL(file))
      }
    }

    if (validFiles.length > 0) {
      setSelectedImages(prev => [...prev, ...validFiles])
      setImagePreviewUrls(prev => [...prev, ...newPreviewUrls])
    }
  }

  const handleSubmit = async () => {
    if (!isValid || loading || uploadingImages || !user?.id) return

    setLoading(true)
    setUploadingImages(true)
    setError('')

    try {
      // 上传图片
      let imageUrls: string[] = []
      if (selectedImages.length > 0) {
        const uploadPromises = selectedImages.map(file => uploadImage(file, user.id))
        imageUrls = await Promise.all(uploadPromises)
      }

      // 提交动态
      await onSubmit(content.trim(), imageUrls.length > 0 ? imageUrls : undefined)

      // 成功后关闭对话框
      onClose()
    } catch (err) {
      console.error('发布失败:', err)
      setError(err instanceof Error ? err.message : '发布失败，请重试')
    } finally {
      setLoading(false)
      setUploadingImages(false)
    }
  }

  // 如果未打开，不渲染
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* 遮罩层 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !loading && onClose()}
      />

      {/* 对话框 */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 animate-scale-up">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">发布动态</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 输入区域 */}
        <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* 用户头像和输入框 */}
          <div className="flex space-x-3">
            {/* 头像 */}
            {authLoading ? (
              <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse flex-shrink-0"></div>
            ) : (
              <Avatar
                username={profile?.username}
                avatarUrl={profile?.avatar_url}
                avatarTemplate={profile?.avatar_template}
                size="md"
                className="flex-shrink-0"
              />
            )}

            {/* 输入区域 */}
            <div
              className="flex-1 min-w-0"
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onPaste={handlePaste}
                  placeholder="分享你的想法..."
                  maxLength={MAX_CHARACTERS}
                  disabled={loading}
                  className={`w-full p-3 border rounded-xl resize-none focus:outline-none focus:ring-2 transition-all ${
                    loading ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
                  } ${
                    remainingChars < 0
                      ? 'border-red-300 focus:ring-red-500'
                      : isDragging
                      ? 'border-blue-500 focus:ring-blue-500 ring-2 ring-blue-300'
                      : 'border-gray-200 focus:ring-blue-500'
                  }`}
                  rows={4}
                />

                {/* 拖拽提示 */}
                {isDragging && (
                  <div className="absolute inset-0 bg-blue-50 bg-opacity-90 border-2 border-dashed border-blue-500 rounded-xl flex items-center justify-center">
                    <div className="text-center pointer-events-none">
                      <ImageIcon className="w-10 h-10 text-blue-500 mx-auto mb-2" />
                      <p className="text-blue-600 font-semibold text-sm">松开上传图片</p>
                      <p className="text-blue-500 text-xs mt-1">还可上传 {MAX_IMAGES - selectedImages.length} 张</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 图片预览 */}
              {imagePreviewUrls.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {imagePreviewUrls.map((url, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-visible border border-gray-200"
                    >
                      <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none z-0">
                        <Image
                          src={url}
                          alt={`预览 ${index + 1}`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        disabled={loading}
                        className="absolute -top-2 -left-2 p-1.5 bg-red-500 text-white rounded-full
                                   shadow-lg disabled:opacity-50 disabled:cursor-not-allowed
                                   z-50 hover:bg-red-600 active:scale-95
                                   transition-colors pointer-events-auto"
                        style={{ pointerEvents: 'auto' }}
                        aria-label="删除图片"
                      >
                        <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 工具栏 */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center space-x-3">
                  {/* 图片按钮 */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                    disabled={loading || selectedImages.length >= MAX_IMAGES}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading || selectedImages.length >= MAX_IMAGES}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      selectedImages.length >= MAX_IMAGES
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>图片</span>
                  </button>

                  {/* 图片计数 */}
                  {selectedImages.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {selectedImages.length}/{MAX_IMAGES}
                    </span>
                  )}
                </div>

                {/* 字符计数 */}
                <div className={`text-sm ${remainingChars < 20 ? 'text-red-500' : 'text-gray-500'}`}>
                  {remainingChars < 0 ? (
                    <span className="font-semibold">超出 {Math.abs(remainingChars)} 字</span>
                  ) : (
                    <span>还可输入 {remainingChars} 字</span>
                  )}
                </div>
              </div>

              {/* 错误信息 */}
              {error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 按钮区域 */}
        <div className="flex items-center justify-end gap-3 p-4 border-t">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleSubmit}
            disabled={!isValid || loading || uploadingImages}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              !isValid || loading || uploadingImages
                ? 'bg-blue-300 text-white cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 active:scale-95 shadow-md'
            }`}
          >
            {uploadingImages ? (
              <span className="flex items-center">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                上传中...
              </span>
            ) : loading ? (
              <span className="flex items-center">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                发布中...
              </span>
            ) : (
              '发布'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
