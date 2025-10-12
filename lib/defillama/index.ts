/**
 * DeFiLlama API 客户端入口
 *
 * @example
 * ```ts
 * import { defillama } from '@/lib/defillama'
 *
 * // 获取协议信息
 * const protocols = await defillama.getProtocols()
 *
 * // 获取代币价格
 * const price = await defillama.getTokenPrice('ethereum', '0x...')
 * ```
 */

export { defillama, DeFiLlamaClient } from './client'
export type {
  Protocol,
  ProtocolDetail,
  Chain,
  TokenPrice,
  TokenIdentifier,
  TokenPricesResponse,
  YieldPool,
  ApiError
} from './types'
export { isApiError } from './types'
