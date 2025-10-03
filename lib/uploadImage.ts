import { supabase } from './supabase'

// 支持的图片类型
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

// 单张图片最大 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024

/**
 * 上传图片到 Supabase Storage
 * @param file - 图片文件
 * @param userId - 用户 ID
 * @returns 图片的公开访问 URL
 */
export async function uploadImage(file: File, userId: string): Promise<string> {
  // 验证文件类型
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('不支持的图片格式，仅支持 JPG、PNG、GIF、WebP')
  }

  // 验证文件大小
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('图片大小不能超过 5MB')
  }

  // 生成唯一文件名：{user_id}/{timestamp}_{random}.{ext}
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const ext = file.name.split('.').pop() || 'jpg'
  const fileName = `${userId}/${timestamp}_${random}.${ext}`

  try {
    // 上传到 Supabase Storage
    const { data, error } = await supabase.storage
      .from('post-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('上传图片错误:', error)
      throw new Error('图片上传失败，请重试')
    }

    // 获取公开访问 URL
    const { data: urlData } = supabase.storage
      .from('post-images')
      .getPublicUrl(data.path)

    return urlData.publicUrl
  } catch (error) {
    console.error('上传图片错误:', error)
    throw error instanceof Error ? error : new Error('图片上传失败')
  }
}

/**
 * 从 Supabase Storage 删除图片
 * @param url - 图片的公开访问 URL
 */
export async function deleteImage(url: string): Promise<void> {
  try {
    // 从 URL 提取文件路径
    const path = extractPathFromUrl(url)
    if (!path) {
      console.error('无法从 URL 提取路径:', url)
      return
    }

    const { error } = await supabase.storage
      .from('post-images')
      .remove([path])

    if (error) {
      console.error('删除图片错误:', error)
      throw new Error('删除图片失败')
    }
  } catch (error) {
    console.error('删除图片错误:', error)
    throw error instanceof Error ? error : new Error('删除图片失败')
  }
}

/**
 * 批量删除图片
 * @param urls - 图片 URL 数组
 */
export async function deleteImages(urls: string[]): Promise<void> {
  try {
    const paths = urls.map(extractPathFromUrl).filter(Boolean) as string[]

    if (paths.length === 0) return

    const { error } = await supabase.storage
      .from('post-images')
      .remove(paths)

    if (error) {
      console.error('批量删除图片错误:', error)
      throw new Error('删除图片失败')
    }
  } catch (error) {
    console.error('批量删除图片错误:', error)
    // 不抛出错误，因为删除失败不应该影响主流程
  }
}

/**
 * 从 URL 提取文件路径
 * @param url - 完整的公开访问 URL
 * @returns 文件路径
 */
function extractPathFromUrl(url: string): string | null {
  try {
    // Supabase Storage URL 格式：
    // https://{project}.supabase.co/storage/v1/object/public/post-images/{path}
    const match = url.match(/\/post-images\/(.+)$/)
    return match ? match[1] : null
  } catch (error) {
    console.error('提取路径错误:', error)
    return null
  }
}

/**
 * 获取图片的完整 URL
 * @param path - 文件路径
 * @returns 完整的公开访问 URL
 */
export function getImageUrl(path: string): string {
  const { data } = supabase.storage
    .from('post-images')
    .getPublicUrl(path)

  return data.publicUrl
}

/**
 * 验证图片文件
 * @param file - 文件对象
 * @returns 验证结果
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: '不支持的图片格式，仅支持 JPG、PNG、GIF、WebP',
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: '图片大小不能超过 5MB',
    }
  }

  return { valid: true }
}
