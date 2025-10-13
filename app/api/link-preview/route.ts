import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export interface LinkPreviewData {
  url: string
  title?: string
  description?: string
  image?: string
  siteName?: string
  favicon?: string
}

// 从 HTML 中提取 Open Graph 和 Twitter Card 元数据
function extractMetadata(html: string, url: string): LinkPreviewData {
  const $ = cheerio.load(html)

  // 优先使用 Open Graph 标签，其次是 Twitter Card
  const getMetaContent = (property: string): string | undefined => {
    // 尝试 Open Graph
    let content = $(`meta[property="${property}"]`).attr('content')
    if (content) return content

    // 尝试 Twitter Card
    const twitterProp = property.replace('og:', 'twitter:')
    content = $(`meta[name="${twitterProp}"]`).attr('content')
    if (content) return content

    return undefined
  }

  // 获取标题
  const title =
    getMetaContent('og:title') ||
    getMetaContent('twitter:title') ||
    $('title').text() ||
    undefined

  // 获取描述
  const description =
    getMetaContent('og:description') ||
    getMetaContent('twitter:description') ||
    $('meta[name="description"]').attr('content') ||
    undefined

  // 获取图片
  let image =
    getMetaContent('og:image') ||
    getMetaContent('twitter:image') ||
    undefined

  // 如果图片是相对路径，转换为绝对路径
  if (image && !image.startsWith('http')) {
    try {
      const baseUrl = new URL(url)
      image = new URL(image, baseUrl.origin).href
    } catch (e) {
      console.error('Invalid image URL:', e)
    }
  }

  // 获取站点名称
  const siteName =
    getMetaContent('og:site_name') ||
    undefined

  // 获取 favicon
  let favicon =
    $('link[rel="icon"]').attr('href') ||
    $('link[rel="shortcut icon"]').attr('href') ||
    undefined

  // 如果 favicon 是相对路径，转换为绝对路径
  if (favicon && !favicon.startsWith('http')) {
    try {
      const baseUrl = new URL(url)
      favicon = new URL(favicon, baseUrl.origin).href
    } catch (e) {
      // 如果转换失败，使用默认 favicon 路径
      try {
        const baseUrl = new URL(url)
        favicon = `${baseUrl.origin}/favicon.ico`
      } catch {
        favicon = undefined
      }
    }
  }

  return {
    url,
    title,
    description,
    image,
    siteName,
    favicon
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json(
        { error: '缺少 URL 参数' },
        { status: 400 }
      )
    }

    // 验证 URL 格式
    let validUrl: URL
    try {
      validUrl = new URL(url)
    } catch (e) {
      return NextResponse.json(
        { error: '无效的 URL 格式' },
        { status: 400 }
      )
    }

    // 只允许 http 和 https 协议
    if (!['http:', 'https:'].includes(validUrl.protocol)) {
      return NextResponse.json(
        { error: '不支持的协议' },
        { status: 400 }
      )
    }

    // 获取网页内容
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MiniSocialBot/1.0)',
      },
      // 10秒超时
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `无法获取网页内容: ${response.status}` },
        { status: response.status }
      )
    }

    // 检查 Content-Type 是否为 HTML
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('text/html')) {
      return NextResponse.json(
        { error: '不支持的内容类型' },
        { status: 400 }
      )
    }

    // 获取 HTML 内容
    const html = await response.text()

    // 提取元数据
    const metadata = extractMetadata(html, url)

    return NextResponse.json(metadata)
  } catch (error) {
    console.error('获取链接预览失败:', error)

    // 处理超时错误
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: '请求超时' },
        { status: 408 }
      )
    }

    return NextResponse.json(
      { error: '获取链接预览失败' },
      { status: 500 }
    )
  }
}
