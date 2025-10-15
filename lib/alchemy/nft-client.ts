/**
 * Alchemy NFT API 客户端
 * 用于获取用户的 NFT 资产
 */

export interface NFT {
  contract: {
    address: string
    name?: string
    symbol?: string
    totalSupply?: string
  }
  tokenId: string
  tokenType: 'ERC721' | 'ERC1155'
  title?: string
  description?: string
  tokenUri?: string
  media?: {
    gateway?: string
    thumbnail?: string
    raw?: string
    format?: string
  }[]
  metadata?: {
    name?: string
    description?: string
    image?: string
    external_url?: string
    attributes?: {
      trait_type: string
      value: string | number
    }[]
  }
  timeLastUpdated?: string
  balance?: string
}

export interface NFTsResponse {
  ownedNfts: NFT[]
  totalCount: number
  pageKey?: string
}

/**
 * Alchemy NFT 客户端类
 */
export class AlchemyNFTClient {
  private apiKey: string
  private network: 'eth-mainnet' | 'eth-sepolia' | 'polygon-mainnet' | 'polygon-mumbai'
  private baseUrl: string

  constructor(
    apiKey: string,
    network: 'eth-mainnet' | 'eth-sepolia' | 'polygon-mainnet' | 'polygon-mumbai' = 'eth-mainnet'
  ) {
    this.apiKey = apiKey
    this.network = network
    this.baseUrl = `https://${network}.g.alchemy.com/nft/v3/${apiKey}`
  }

  /**
   * 获取钱包拥有的所有 NFT
   */
  async getNFTsForOwner(
    ownerAddress: string,
    options?: {
      pageKey?: string
      pageSize?: number
      contractAddresses?: string[]
      excludeFilters?: ('SPAM' | 'AIRDROPS')[]
      includeFilters?: ('SPAM' | 'AIRDROPS')[]
      orderBy?: 'transferTime'
    }
  ): Promise<NFTsResponse> {
    try {
      const params = new URLSearchParams({
        owner: ownerAddress,
      })

      if (options?.pageKey) params.append('pageKey', options.pageKey)
      if (options?.pageSize) params.append('pageSize', options.pageSize.toString())
      if (options?.contractAddresses) {
        options.contractAddresses.forEach(addr => params.append('contractAddresses[]', addr))
      }
      if (options?.excludeFilters) {
        options.excludeFilters.forEach(filter => params.append('excludeFilters[]', filter))
      }
      if (options?.includeFilters) {
        options.includeFilters.forEach(filter => params.append('includeFilters[]', filter))
      }
      if (options?.orderBy) params.append('orderBy', options.orderBy)

      const response = await fetch(`${this.baseUrl}/getNFTsForOwner?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Alchemy API Error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('[Alchemy NFT] 获取 NFT 失败:', error)
      throw error
    }
  }

  /**
   * 获取 NFT 元数据
   */
  async getNFTMetadata(
    contractAddress: string,
    tokenId: string,
    options?: {
      refreshCache?: boolean
    }
  ): Promise<NFT> {
    try {
      const params = new URLSearchParams({
        contractAddress,
        tokenId,
      })

      if (options?.refreshCache) params.append('refreshCache', 'true')

      const response = await fetch(`${this.baseUrl}/getNFTMetadata?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Alchemy API Error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('[Alchemy NFT] 获取 NFT 元数据失败:', error)
      throw error
    }
  }

  /**
   * 获取 NFT 图片 URL
   */
  getNFTImageUrl(nft: NFT): string | null {
    // 优先使用 gateway URL（已处理 IPFS 等）
    if (nft.media && nft.media.length > 0) {
      const media = nft.media[0]
      return media.gateway || media.thumbnail || media.raw || null
    }

    // 回退到 metadata 中的 image
    if (nft.metadata?.image) {
      return nft.metadata.image
    }

    return null
  }

  /**
   * 获取 NFT 名称
   */
  getNFTName(nft: NFT): string {
    return (
      nft.title ||
      nft.metadata?.name ||
      `${nft.contract.symbol || 'NFT'} #${nft.tokenId}` ||
      `Token #${nft.tokenId}`
    )
  }

  /**
   * 过滤掉无效的 NFT（没有图片的）
   */
  filterValidNFTs(nfts: NFT[]): NFT[] {
    return nfts.filter(nft => {
      const imageUrl = this.getNFTImageUrl(nft)
      return imageUrl !== null && imageUrl !== ''
    })
  }
}

/**
 * 创建默认的 Alchemy NFT 客户端实例
 */
export function createAlchemyNFTClient() {
  const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY

  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_ALCHEMY_API_KEY is not set')
  }

  // 默认使用以太坊主网
  return new AlchemyNFTClient(apiKey, 'eth-mainnet')
}

/**
 * 单例 NFT 客户端
 */
let nftClient: AlchemyNFTClient | null = null

export function getAlchemyNFTClient(): AlchemyNFTClient {
  if (!nftClient) {
    nftClient = createAlchemyNFTClient()
  }
  return nftClient
}
