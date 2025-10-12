import { useQuery } from '@tanstack/react-query'
import { ProtocolDetail } from '@/lib/defillama/types'

interface UseProtocolDetailOptions {
  enabled?: boolean
}

export function useProtocolDetail(
  slug: string,
  options?: UseProtocolDetailOptions
) {
  return useQuery<ProtocolDetail>({
    queryKey: ['protocol', slug],
    queryFn: async () => {
      const response = await fetch(`/api/defi/protocols/${slug}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '获取协议详情失败')
      }

      const data = await response.json()
      return data.protocol as ProtocolDetail
    },
    enabled: !!slug && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000, // 5 分钟
    gcTime: 30 * 60 * 1000, // 30 分钟 (React Query v5: cacheTime renamed to gcTime)
  })
}
