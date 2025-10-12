import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 分钟
      gcTime: 10 * 60 * 1000, // 10 分钟 (React Query v5: cacheTime renamed to gcTime)
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
})
