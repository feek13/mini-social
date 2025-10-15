'use client'

import { useState, useEffect } from 'react'
import { Image as ImageIcon, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAccount } from 'wagmi'

interface NFT {
  contractAddress: string
  tokenId: string
  tokenType: string
  name: string
  description?: string
  imageUrl: string | null
  collectionName?: string
  collectionSymbol?: string
}

interface NFTAvatarPickerProps {
  onSelect: (nft: NFT | null) => void
  selectedNFT?: NFT | null
  onClose?: () => void
}

export default function NFTAvatarPicker({
  onSelect,
  selectedNFT,
  onClose,
}: NFTAvatarPickerProps) {
  const { address: walletAddress } = useAccount()
  const [nfts, setNfts] = useState<NFT[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pageKey, setPageKey] = useState<string | undefined>()
  const [hasMore, setHasMore] = useState(false)
  const [selected, setSelected] = useState<NFT | null>(selectedNFT || null)

  // 加载 NFT
  useEffect(() => {
    if (!walletAddress) {
      setError('请先连接钱包')
      return
    }

    fetchNFTs()
  }, [walletAddress])

  const fetchNFTs = async (loadMore = false) => {
    if (!walletAddress) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        address: walletAddress,
        pageSize: '20',
      })

      if (loadMore && pageKey) {
        params.append('pageKey', pageKey)
      }

      const response = await fetch(`/api/wallet/nfts?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '获取 NFT 失败')
      }

      if (loadMore) {
        setNfts(prev => [...prev, ...data.nfts])
      } else {
        setNfts(data.nfts)
      }

      setPageKey(data.pageKey)
      setHasMore(data.hasMore)
    } catch (err) {
      console.error('获取 NFT 错误:', err)
      setError(err instanceof Error ? err.message : '获取 NFT 失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (nft: NFT) => {
    setSelected(nft)
  }

  const handleConfirm = () => {
    onSelect(selected)
    if (onClose) onClose()
  }

  const handleCancel = () => {
    onSelect(null)
    if (onClose) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">选择 NFT 头像</h2>
          <p className="text-sm text-gray-600 mt-1">
            从你的钱包中选择一个 NFT 作为头像
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 错误状态 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-600 font-medium">{error}</p>
                <p className="text-red-500 text-sm mt-1">
                  请确保你已连接钱包并授权访问
                </p>
              </div>
            </div>
          )}

          {/* 加载状态 */}
          {loading && nfts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
              <p className="text-gray-600">正在加载你的 NFT...</p>
            </div>
          )}

          {/* 无 NFT */}
          {!loading && !error && nfts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <ImageIcon className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-600 text-lg font-medium">还没有 NFT</p>
              <p className="text-gray-500 text-sm mt-2">
                连接的钱包中没有找到任何 NFT
              </p>
            </div>
          )}

          {/* NFT 网格 */}
          {nfts.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {nfts.map((nft) => (
                  <button
                    key={`${nft.contractAddress}-${nft.tokenId}`}
                    onClick={() => handleSelect(nft)}
                    className={`group relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selected?.contractAddress === nft.contractAddress &&
                      selected?.tokenId === nft.tokenId
                        ? 'border-blue-500 ring-4 ring-blue-200'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {nft.imageUrl ? (
                      <img
                        src={nft.imageUrl}
                        alt={nft.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    )}

                    {/* Overlay with name */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <p className="text-white text-xs font-medium truncate">
                          {nft.name}
                        </p>
                        {nft.collectionName && (
                          <p className="text-white/70 text-xs truncate">
                            {nft.collectionName}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Selected indicator */}
                    {selected?.contractAddress === nft.contractAddress &&
                      selected?.tokenId === nft.tokenId && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-white"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        </div>
                      )}
                  </button>
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => fetchNFTs(true)}
                    disabled={loading}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition inline-flex items-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>加载中...</span>
                      </>
                    ) : (
                      <>
                        <ChevronRight className="w-4 h-4" />
                        <span>加载更多</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handleCancel}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
          >
            取消
          </button>

          <button
            onClick={handleConfirm}
            disabled={!selected}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            确认选择
          </button>
        </div>
      </div>
    </div>
  )
}
