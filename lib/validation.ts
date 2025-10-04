import { z } from 'zod'

/**
 * 动态内容验证
 */
export const PostSchema = z.object({
  content: z.string()
    .trim()
    .max(280, '动态内容不能超过 280 个字符')
    .optional(),
  images: z.array(z.string().url('图片必须是有效的 URL'))
    .max(9, '最多上传 9 张图片')
    .optional(),
}).refine(
  (data) => (data.content && data.content.length > 0) || (data.images && data.images.length > 0),
  { message: '请输入动态内容或上传图片' }
)

/**
 * 转发动态验证
 */
export const RepostSchema = z.object({
  originalPostId: z.string().uuid('无效的动态 ID'),
  comment: z.string()
    .trim()
    .max(280, '转发评论不能超过 280 个字符')
    .optional(),
})

/**
 * 评论验证
 */
export const CommentSchema = z.object({
  content: z.string()
    .min(1, '评论不能为空')
    .max(280, '评论不能超过 280 字符')
    .trim(),
  postId: z.string().uuid('无效的动态 ID').optional(),
  parentCommentId: z.string().uuid('无效的评论 ID').optional(),
})

/**
 * 用户资料验证
 */
export const ProfileSchema = z.object({
  username: z.string()
    .min(3, '用户名至少 3 个字符')
    .max(20, '用户名最多 20 个字符')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线')
    .optional(),
  bio: z.string()
    .max(160, '简介最多 160 字符')
    .optional(),
  location: z.string()
    .max(50, '位置最多 50 字符')
    .optional(),
  avatar_url: z.string()
    .url('头像必须是有效的 URL')
    .optional()
    .nullable(),
  avatar_template: z.string()
    .optional()
    .nullable(),
})

/**
 * 搜索查询验证
 */
export const SearchSchema = z.object({
  q: z.string()
    .min(1, '搜索关键词不能为空')
    .max(100, '搜索关键词最多 100 个字符')
    .trim(),
  type: z.enum(['posts', 'users', 'all']).optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
})

/**
 * 分页参数验证
 */
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
})

/**
 * 验证数据并返回结果
 * @param schema Zod schema
 * @param data 待验证数据
 * @returns 验证结果
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)

  if (!result.success) {
    const firstError = result.error.issues[0]
    return {
      success: false,
      error: firstError.message
    }
  }

  return {
    success: true,
    data: result.data
  }
}
