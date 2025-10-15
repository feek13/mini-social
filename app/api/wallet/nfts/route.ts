import { NextRequest, NextResponse } from 'next/server'
import { getAlchemyNFTClient } from '@/lib/alchemy/nft-client'

/**
 * 获取钱包的 NFT
 * GET /api/wallet/nfts?address={walletAddress}
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const address = searchParams.get('address')
    const pageKey = searchParams.get('pageKey') || undefined
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    if (!address) {
      return NextResponse.json(
        { error: '缺少钱包地址参数' },
        { status: 400 }
      )
    }

    // 验证钱包地址格式
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: '无效的钱包地址' },
        { status: 400 }
      )
    }

    const nftClient = getAlchemyNFTClient()

    // 获取 NFT，排除垃圾邮件和空投
    const result = await nftClient.getNFTsForOwner(address, {
      pageKey,
      pageSize,
      excludeFilters: ['SPAM', 'AIRDROPS'],
      orderBy: 'transferTime',
    })

    // 过滤掉没有图片的 NFT
    const validNFTs = nftClient.filterValidNFTs(result.ownedNfts)

    // 格式化响应
    const nfts = validNFTs.map(nft => ({
      contractAddress: nft.contract.address,
      tokenId: nft.tokenId,
      tokenType: nft.tokenType,
      name: nftClient.getNFTName(nft),
      description: nft.description || nft.metadata?.description,
      imageUrl: nftClient.getNFTImageUrl(nft),
      collectionName: nft.contract.name,
      collectionSymbol: nft.contract.symbol,
    }))

    return NextResponse.json({
      nfts,
      totalCount: result.totalCount,
      pageKey: result.pageKey,
      hasMore: !!result.pageKey,
    })
  } catch (error) {
    console.error('[Wallet NFTs API] 错误:', error)
    return NextResponse.json(
      { error: '获取 NFT 失败' },
      { status: 500 }
    )
  }
}
