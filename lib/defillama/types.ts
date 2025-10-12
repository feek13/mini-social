// DeFiLlama API 类型定义

/**
 * 协议基本信息（列表视图）
 */
export type Protocol = {
  id: string
  name: string
  address: string | null
  symbol: string
  url: string
  description: string
  chain: string
  logo: string | null
  audits: string
  audit_note: string | null
  gecko_id: string | null
  cmcId: string | null
  category: string
  chains: string[]
  module: string
  twitter: string | null
  forkedFrom: string[]
  oracles: string[]
  listedAt: number
  slug: string
  tvl: number
  chainTvls: Record<string, number>
  change_1h: number | null
  change_1d: number | null
  change_7d: number | null
  staking: number
  fdv: number | null
  mcap: number | null
}

/**
 * 协议详细信息
 */
export type ProtocolDetail = {
  id: string
  name: string
  address: string | null
  symbol: string
  url: string
  description: string
  chain: string
  logo: string | null
  audits: string
  audit_note: string | null
  gecko_id: string | null
  cmcId: string | null
  category: string
  chains: string[]
  module: string
  twitter: string | null
  forkedFrom: string[]
  oracles: string[]
  listedAt: number
  slug: string
  tvl: number[]
  chainTvls: Record<string, { tvl: number[] }>
  tokens: string[]
  change_1h: number | null
  change_1d: number | null
  change_7d: number | null
  fdv: number | null
  mcap: number | null
  currentChainTvls: Record<string, number>
}

/**
 * 链 TVL 信息
 */
export type Chain = {
  gecko_id: string | null
  tvl: number
  tokenSymbol: string | null
  cmcId: string | null
  name: string
  chainId: number | null
}

/**
 * 代币价格信息
 */
export type TokenPrice = {
  decimals: number
  symbol: string
  price: number
  timestamp: number
  confidence: number
}

/**
 * 代币价格查询参数
 */
export type TokenIdentifier = {
  chain: string
  address: string
}

/**
 * 批量代币价格响应
 */
export type TokenPricesResponse = {
  coins: Record<string, TokenPrice>
}

/**
 * 收益率池子信息
 */
export type YieldPool = {
  chain: string
  project: string
  symbol: string
  tvlUsd: number
  apyBase: number | null
  apyReward: number | null
  apy: number
  rewardTokens: string[] | null
  pool: string
  apyPct1D: number | null
  apyPct7D: number | null
  apyPct30D: number | null
  stablecoin: boolean
  ilRisk: string
  exposure: string
  predictions: {
    predictedClass: string
    predictedProbability: number
    binnedConfidence: number
  } | null
  poolMeta: string | null
  mu: number | null
  sigma: number | null
  count: number | null
  outlier: boolean
  underlyingTokens: string[] | null
  il7d: number | null
  apyBase7d: number | null
  apyMean30d: number | null
  volumeUsd1d: number | null
  volumeUsd7d: number | null
  apyBaseInception: number | null
}

/**
 * API 错误响应
 */
export type ApiError = {
  error: string
  message?: string
}

/**
 * 检查是否为错误响应
 */
export function isApiError(response: unknown): response is ApiError {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response
  )
}
