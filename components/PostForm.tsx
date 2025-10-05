'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Image as ImageIcon, X, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { useAuth } from '@/app/providers/AuthProvider'
import Avatar from '@/components/Avatar'
import { uploadImage, validateImageFile } from '@/lib/uploadImage'
import { Post } from '@/types/database'
import { formatRelativeTime } from '@/lib/utils'

interface PostFormProps {
  onSubmit: (content: string, imageUrls?: string[], originalPostId?: string) => Promise<void>
  placeholder?: string
}

const MAX_CHARACTERS = 280
const MAX_IMAGES = 9
const POST_LINK_REGEX = /(?:https?:\/\/[^\s/]+)?\/post\/([a-f0-9-]+)/i

export default function PostForm({
  onSubmit,
  placeholder = '分享你的想法...'
}: PostFormProps) {
  const { user, profile, loading: authLoading } = useAuth()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  // 图片相关状态
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 引用动态相关状态
  const [quotedPost, setQuotedPost] = useState<Post | null>(null)
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)

  const remainingChars = MAX_CHARACTERS - content.length
  const isValid = (content.trim().length > 0 || selectedImages.length > 0 || quotedPost) && remainingChars >= 0

  // 清理函数：组件卸载时重置拖拽状态
  useEffect(() => {
    return () => {
      dragCounterRef.current = 0
      setIsDragging(false)
    }
  }, [])

  // 检测链接并加载引用动态
  useEffect(() => {
    const checkForPostLink = async () => {
      const match = content.match(POST_LINK_REGEX)

      if (match) {
        const postId = match[1]

        // 获取原动态数据
        setIsLoadingQuote(true)
        try {
          const response = await fetch(`/api/posts/${postId}`)
          if (response.ok) {
            const data = await response.json()
            setQuotedPost(data.post)
          } else {
            setQuotedPost(null)
          }
        } catch (error) {
          console.error('获取动态失败:', error)
          setQuotedPost(null)
        } finally {
          setIsLoadingQuote(false)
        }
      } else {
        setQuotedPost(null)
      }
    }

    // 防抖
    const timeoutId = setTimeout(checkForPostLink, 500)
    return () => clearTimeout(timeoutId)
  }, [content])

  // 处理图片选择
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remainingSlots = MAX_IMAGES - selectedImages.length

    if (files.length === 0) return

    // 只取剩余数量的图片
    const filesToAdd = files.slice(0, remainingSlots)

    // 验证每张图片
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

    // 创建预览 URL
    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file))

    setSelectedImages(prev => [...prev, ...validFiles])
    setImagePreviewUrls(prev => [...prev, ...newPreviewUrls])

    // 重置 input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 删除图片
  const handleRemoveImage = (index: number) => {
    // 释放预览 URL
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

  // 处理拖拽上传的函数
  const dragCounterRef = useRef(0)

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

    // 处理文件拖拽
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
    } else {
      // 处理网页内图片拖拽（URL形式）
      const imageUrl = e.dataTransfer.getData('text/html')
      const urlMatch = imageUrl.match(/src="([^"]+)"/) || imageUrl.match(/src='([^']+)'/)

      if (urlMatch && urlMatch[1]) {
        const imgSrc = urlMatch[1]

        try {
          // 从URL下载图片
          const response = await fetch(imgSrc)
          const blob = await response.blob()

          // 获取文件扩展名
          const contentType = blob.type || 'image/jpeg'
          const extension = contentType.split('/')[1] || 'jpg'
          const fileName = `dropped-image-${Date.now()}.${extension}`

          // 转换为File对象
          const file = new File([blob], fileName, { type: contentType })

          const validation = validateImageFile(file)
          if (!validation.valid) {
            setError(validation.error || '图片验证失败')
            setTimeout(() => setError(''), 3000)
            return
          }

          validFiles.push(file)
          newPreviewUrls.push(URL.createObjectURL(file))
        } catch (err) {
          console.error('下载图片失败:', err)
          setError('无法下载该图片')
          setTimeout(() => setError(''), 3000)
          return
        }
      }
    }

    if (validFiles.length > 0) {
      setSelectedImages(prev => [...prev, ...validFiles])
      setImagePreviewUrls(prev => [...prev, ...newPreviewUrls])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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

      // 如果有引用动态，从内容中移除链接
      let finalContent = content.trim()
      if (quotedPost) {
        finalContent = finalContent.replace(POST_LINK_REGEX, '').trim()
      }

      // 提交动态
      await onSubmit(
        finalContent,
        imageUrls.length > 0 ? imageUrls : undefined,
        quotedPost?.id
      )

      // 清空状态
      setContent('')
      setSelectedImages([])
      setImagePreviewUrls([])
      setQuotedPost(null)
      setIsFocused(false)

      // 清理预览 URL
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url))
    } catch (err) {
      console.error('发布失败:', err)
      setError(err instanceof Error ? err.message : '发布失败，请重试')
    } finally {
      setLoading(false)
      setUploadingImages(false)
    }
  }

  if (!user) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
        <Sparkles className="w-12 h-12 text-blue-500 mx-auto mb-3" />
        <p className="text-gray-600">
          请先
          <a href="/login" className="text-blue-500 hover:text-blue-600 font-medium mx-1 transition">
            登录
          </a>
          后发布动态
        </p>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border transition-all ${
      isFocused ? 'border-blue-300 shadow-md' : 'border-gray-100'
    } p-4 sm:p-6 animate-slide-up`}>
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

        {/* 表单 - 整个表单区域都支持拖拽 */}
        <div
          className="flex-1 min-w-0 relative"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <form onSubmit={handleSubmit}>
            {/* 文本输入框 */}
            <div className="relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onPaste={handlePaste}
                placeholder={placeholder}
                maxLength={MAX_CHARACTERS}
                disabled={loading}
                className={`w-full p-3 border rounded-xl resize-none focus:outline-none focus:ring-2 transition-all ${
                  loading ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
                } ${
                  remainingChars < 0
                    ? 'border-red-300 focus:ring-red-500 focus:border-transparent'
                    : isDragging
                    ? 'border-blue-500 focus:ring-blue-500 ring-2 ring-blue-300'
                    : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
                }`}
                rows={isFocused ? 4 : 3}
              />

              {/* 拖拽时的视觉反馈 - 只覆盖输入框区域 */}
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

            {/* 引用预览 */}
            {quotedPost && (
              <div className="mt-3 border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 font-medium">引用动态：</span>
                  <button
                    type="button"
                    onClick={() => {
                      // 移除链接
                      setContent(content.replace(POST_LINK_REGEX, '').trim())
                      setQuotedPost(null)
                    }}
                    className="text-gray-400 hover:text-gray-600 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 原动态预览（缩小版）*/}
                <div className="text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar
                      username={quotedPost.user?.username}
                      avatarUrl={quotedPost.user?.avatar_url}
                      avatarTemplate={quotedPost.user?.avatar_template}
                      size="sm"
                    />
                    <span className="font-semibold">{quotedPost.user?.username || '未知用户'}</span>
                    <span className="text-gray-400 text-xs">·</span>
                    <span className="text-gray-500 text-xs" suppressHydrationWarning>
                      {formatRelativeTime(quotedPost.created_at)}
                    </span>
                  </div>
                  <p className="text-gray-700 line-clamp-3 mt-2">{quotedPost.content}</p>
                </div>
              </div>
            )}

            {/* 加载引用提示 */}
            {isLoadingQuote && (
              <div className="mt-3 text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                正在加载引用的动态...
              </div>
            )}

            {/* 图片预览网格 */}
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
                    {/* 删除按钮 */}
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

            {/* 底部：图片选择、字符计数和发布按钮 */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-3">
                {/* 图片选择按钮 */}
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
                title={selectedImages.length >= MAX_IMAGES ? '最多 9 张图片' : '点击、拖拽或粘贴图片上传'}
              >
                  <ImageIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">图片</span>
                </button>

                {/* 图片计数提示 */}
                {selectedImages.length > 0 && (
                  <span className="text-xs text-gray-500">
                    {selectedImages.length}/{MAX_IMAGES}
                  </span>
                )}

                {/* 字符计数 */}
                {content.length > 0 && (
                  <>
                    <div className="relative w-8 h-8">
                      <svg className="transform -rotate-90 w-8 h-8">
                        <circle
                          cx="16"
                          cy="16"
                          r="14"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="none"
                          className="text-gray-200"
                        />
                        <circle
                          cx="16"
                          cy="16"
                          r="14"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 14}`}
                          strokeDashoffset={`${2 * Math.PI * 14 * (1 - (MAX_CHARACTERS - remainingChars) / MAX_CHARACTERS)}`}
                          className={
                            remainingChars < 0
                              ? 'text-red-500'
                              : remainingChars < 20
                              ? 'text-orange-500'
                              : 'text-blue-500'
                          }
                        />
                      </svg>
                      <span
                        className={`absolute inset-0 flex items-center justify-center text-xs font-medium ${
                          remainingChars < 0
                            ? 'text-red-500'
                            : remainingChars < 20
                            ? 'text-orange-500'
                            : 'text-gray-500'
                        }`}
                      >
                        {remainingChars < 20 ? remainingChars : ''}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* 发布按钮 */}
              <button
                type="submit"
                disabled={!isValid || loading || uploadingImages}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault()
                  handleSubmit(e)
                }}
                className={`px-5 py-2 rounded-full font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  !isValid || loading || uploadingImages
                    ? 'bg-blue-300 text-white cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 active:scale-95 shadow-md hover:shadow-lg'
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

            {/* 错误信息 */}
            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg animate-slide-up">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
