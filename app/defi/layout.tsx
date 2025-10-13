import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'DeFi 数据浏览器',
  description: '浏览 DeFi 协议、收益率池子和代币价格。实时 TVL 数据、收益率排名、代币价格查询。',
  openGraph: {
    title: 'DeFi 数据浏览器 - MiniSocial',
    description: '浏览 DeFi 协议、收益率池子和代币价格。实时 TVL 数据、收益率排名、代币价格查询。',
    url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/defi`,
    siteName: 'MiniSocial',
    images: [
      {
        url: '/og-defi.png',
        width: 1200,
        height: 630,
        alt: 'DeFi 数据浏览器',
      },
    ],
    type: 'website',
    locale: 'zh_CN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DeFi 数据浏览器 - MiniSocial',
    description: '浏览 DeFi 协议、收益率池子和代币价格',
    images: ['/og-defi.png'],
  },
}

export default function DeFiLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
