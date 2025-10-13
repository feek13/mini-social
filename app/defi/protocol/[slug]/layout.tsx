import { Metadata } from 'next'

// 从 DeFiLlama API 获取协议信息
async function getProtocolInfo(slug: string) {
  try {
    const response = await fetch(`https://api.llama.fi/protocol/${slug}`, {
      next: { revalidate: 3600 } // 缓存 1 小时
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data
  } catch {
    return null
  }
}

// 生成动态元数据
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const protocol = await getProtocolInfo(slug)

  if (!protocol) {
    return {
      title: 'DeFi 协议详情',
      description: '查看 DeFi 协议的详细信息、TVL 数据和收益率'
    }
  }

  // 计算 TVL
  let currentTVL = 0
  if (protocol.currentChainTvls) {
    currentTVL = Object.values(protocol.currentChainTvls as Record<string, number>).reduce((a, b) => a + b, 0)
  } else if (protocol.tvl && Array.isArray(protocol.tvl) && protocol.tvl.length > 0) {
    const lastItem = protocol.tvl[protocol.tvl.length - 1]
    currentTVL = typeof lastItem === 'number' ? lastItem : (lastItem.totalLiquidityUSD || 0)
  }

  const title = `${protocol.name} - DeFi 协议详情`
  const description = protocol.description ||
    `查看 ${protocol.name} 的实时 TVL (${(currentTVL / 1e9).toFixed(2)}B)、链数据、收益率等详细信息。${protocol.category} 类别协议。`

  const url = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/defi/protocol/${slug}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'MiniSocial',
      images: [
        {
          url: protocol.logo || '/og-defi.png',
          width: 1200,
          height: 630,
          alt: `${protocol.name} Logo`,
        },
      ],
      type: 'website',
      locale: 'zh_CN',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [protocol.logo || '/og-defi.png'],
    },
  }
}

export default function ProtocolLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
