/**
 * 智能钱包标签生成系统
 * 基于钱包行为和数据自动打标签
 */

import type { MoralisTokenBalance, MoralisTransaction, WalletLabel } from '@/types/database'
import { identifyDeFiProtocols } from './defi-protocols'

export interface WalletAnalysis {
  totalValue: number
  tokensCount: number
  nftsCount: number
  activeChains: number
  transactions: MoralisTransaction[]
  tokens: MoralisTokenBalance[]
}

/**
 * 生成钱包标签
 */
export function generateWalletLabels(
  address: string,
  analysis: WalletAnalysis,
  chain: string = 'ethereum'
): Omit<WalletLabel, 'id' | 'created_at'>[] {
  const labels: Omit<WalletLabel, 'id' | 'created_at'>[] = []

  // 1. 资产规模标签
  labels.push(...getWealthLabels(analysis.totalValue))

  // 2. DeFi 活动标签
  labels.push(...getDeFiLabels(analysis.transactions, chain))

  // 3. NFT 收藏家标签
  labels.push(...getNFTLabels(analysis.nftsCount))

  // 4. 多链活跃标签
  labels.push(...getMultiChainLabels(analysis.activeChains))

  // 5. 代币持有标签
  labels.push(...getTokenHolderLabels(analysis.tokensCount, analysis.tokens))

  // 6. 交易活跃度标签
  labels.push(...getActivityLabels(analysis.transactions))

  return labels.map((label) => ({
    ...label,
    wallet_address: address.toLowerCase(),
  }))
}

/**
 * 资产规模标签
 */
function getWealthLabels(totalValue: number): Omit<WalletLabel, 'id' | 'wallet_address' | 'created_at'>[] {
  const labels: Omit<WalletLabel, 'id' | 'wallet_address' | 'created_at'>[] = []

  if (totalValue >= 10000000) {
    // $10M+
    labels.push({
      label_type: 'wealth',
      label_value: 'mega_whale',
      label_display: '🐳 超级巨鲸',
      confidence: 1.0,
      evidence: { threshold: 10000000 },
    })
  } else if (totalValue >= 1000000) {
    // $1M+
    labels.push({
      label_type: 'wealth',
      label_value: 'whale',
      label_display: '🐋 巨鲸',
      confidence: 1.0,
      evidence: { threshold: 1000000 },
    })
  } else if (totalValue >= 100000) {
    // $100K+
    labels.push({
      label_type: 'wealth',
      label_value: 'shark',
      label_display: '🦈 鲨鱼',
      confidence: 1.0,
      evidence: { threshold: 100000 },
    })
  } else if (totalValue >= 10000) {
    // $10K+
    labels.push({
      label_type: 'wealth',
      label_value: 'fish',
      label_display: '🐟 小鱼',
      confidence: 1.0,
      evidence: { threshold: 10000 },
    })
  }

  return labels
}

/**
 * DeFi 活动标签
 */
function getDeFiLabels(
  transactions: MoralisTransaction[],
  chain: string
): Omit<WalletLabel, 'id' | 'wallet_address' | 'created_at'>[] {
  const labels: Omit<WalletLabel, 'id' | 'wallet_address' | 'created_at'>[] = []

  if (transactions.length === 0) return labels

  const defiProtocols = identifyDeFiProtocols(transactions, chain)
  const totalInteractions = defiProtocols.reduce((sum, p) => sum + p.interactions, 0)

  if (totalInteractions === 0) return labels

  // DeFi 活跃用户
  if (totalInteractions >= 50) {
    labels.push({
      label_type: 'defi',
      label_value: 'defi_pro',
      label_display: '🚀 DeFi 专家',
      confidence: 0.95,
      evidence: { interactions: totalInteractions, protocols: defiProtocols.length },
    })
  } else if (totalInteractions >= 10) {
    labels.push({
      label_type: 'defi',
      label_value: 'defi_active',
      label_display: '⚡ DeFi 活跃用户',
      confidence: 0.9,
      evidence: { interactions: totalInteractions, protocols: defiProtocols.length },
    })
  }

  // 按类别打标签
  const protocolsByCategory = defiProtocols.reduce((acc, { protocol, interactions }) => {
    const category = protocol.category
    if (!acc[category]) {
      acc[category] = 0
    }
    acc[category] += interactions
    return acc
  }, {} as Record<string, number>)

  // DEX 交易者
  if (protocolsByCategory['DEX'] && protocolsByCategory['DEX'] >= 5) {
    labels.push({
      label_type: 'defi',
      label_value: 'dex_trader',
      label_display: '🔄 DEX 交易者',
      confidence: 0.85,
      evidence: { interactions: protocolsByCategory['DEX'] },
    })
  }

  // 借贷用户
  if (protocolsByCategory['Lending'] && protocolsByCategory['Lending'] >= 3) {
    labels.push({
      label_type: 'defi',
      label_value: 'lending_user',
      label_display: '🏦 借贷用户',
      confidence: 0.85,
      evidence: { interactions: protocolsByCategory['Lending'] },
    })
  }

  // 质押者
  if (protocolsByCategory['Staking'] && protocolsByCategory['Staking'] >= 3) {
    labels.push({
      label_type: 'defi',
      label_value: 'staker',
      label_display: '🔒 质押者',
      confidence: 0.85,
      evidence: { interactions: protocolsByCategory['Staking'] },
    })
  }

  // 跨链桥用户
  if (protocolsByCategory['Bridge'] && protocolsByCategory['Bridge'] >= 2) {
    labels.push({
      label_type: 'defi',
      label_value: 'bridge_user',
      label_display: '🌉 跨链用户',
      confidence: 0.8,
      evidence: { interactions: protocolsByCategory['Bridge'] },
    })
  }

  return labels
}

/**
 * NFT 收藏家标签
 */
function getNFTLabels(nftsCount: number): Omit<WalletLabel, 'id' | 'wallet_address' | 'created_at'>[] {
  const labels: Omit<WalletLabel, 'id' | 'wallet_address' | 'created_at'>[] = []

  if (nftsCount >= 100) {
    labels.push({
      label_type: 'nft',
      label_value: 'nft_collector',
      label_display: '🎨 NFT 收藏家',
      confidence: 0.95,
      evidence: { count: nftsCount },
    })
  } else if (nftsCount >= 20) {
    labels.push({
      label_type: 'nft',
      label_value: 'nft_enthusiast',
      label_display: '🖼️ NFT 爱好者',
      confidence: 0.9,
      evidence: { count: nftsCount },
    })
  }

  return labels
}

/**
 * 多链活跃标签
 */
function getMultiChainLabels(activeChains: number): Omit<WalletLabel, 'id' | 'wallet_address' | 'created_at'>[] {
  const labels: Omit<WalletLabel, 'id' | 'wallet_address' | 'created_at'>[] = []

  if (activeChains >= 8) {
    labels.push({
      label_type: 'activity',
      label_value: 'multi_chain_pro',
      label_display: '🌐 多链大师',
      confidence: 0.95,
      evidence: { chains: activeChains },
    })
  } else if (activeChains >= 5) {
    labels.push({
      label_type: 'activity',
      label_value: 'multi_chain_active',
      label_display: '🔗 多链活跃',
      confidence: 0.9,
      evidence: { chains: activeChains },
    })
  }

  return labels
}

/**
 * 代币持有标签
 */
function getTokenHolderLabels(
  tokensCount: number,
  tokens: MoralisTokenBalance[]
): Omit<WalletLabel, 'id' | 'wallet_address' | 'created_at'>[] {
  const labels: Omit<WalletLabel, 'id' | 'wallet_address' | 'created_at'>[] = []

  if (tokensCount >= 50) {
    labels.push({
      label_type: 'behavior',
      label_value: 'diversified_portfolio',
      label_display: '📊 多元化投资',
      confidence: 0.9,
      evidence: { tokens: tokensCount },
    })
  }

  // 检测稳定币持有者
  const stablecoins = ['USDT', 'USDC', 'DAI', 'BUSD', 'FRAX', 'TUSD']
  const stablecoinHoldings = tokens.filter((t) =>
    t.symbol && stablecoins.includes(t.symbol.toUpperCase())
  )

  if (stablecoinHoldings.length >= 2) {
    const totalStablecoinValue = stablecoinHoldings.reduce(
      (sum, t) => sum + (t.usd_value || 0),
      0
    )

    if (totalStablecoinValue >= 10000) {
      labels.push({
        label_type: 'behavior',
        label_value: 'stablecoin_holder',
        label_display: '💵 稳定币持有者',
        confidence: 0.85,
        evidence: { value: totalStablecoinValue, types: stablecoinHoldings.length },
      })
    }
  }

  return labels
}

/**
 * 交易活跃度标签
 */
function getActivityLabels(
  transactions: MoralisTransaction[]
): Omit<WalletLabel, 'id' | 'wallet_address' | 'created_at'>[] {
  const labels: Omit<WalletLabel, 'id' | 'wallet_address' | 'created_at'>[] = []

  if (transactions.length === 0) return labels

  // 计算成功率
  const successfulTxs = transactions.filter((tx) => tx.receipt_status === '1').length
  const successRate = successfulTxs / transactions.length

  if (successRate >= 0.95 && transactions.length >= 10) {
    labels.push({
      label_type: 'behavior',
      label_value: 'experienced_user',
      label_display: '✨ 经验丰富',
      confidence: 0.9,
      evidence: { success_rate: successRate, total_txs: transactions.length },
    })
  }

  // 检测最近活跃
  const recentTxs = transactions.filter((tx) => {
    const txDate = new Date(tx.block_timestamp)
    const now = new Date()
    const daysDiff = (now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24)
    return daysDiff <= 7
  })

  if (recentTxs.length >= 5) {
    labels.push({
      label_type: 'activity',
      label_value: 'recently_active',
      label_display: '⚡ 最近活跃',
      confidence: 0.95,
      evidence: { recent_txs: recentTxs.length, days: 7 },
    })
  }

  return labels
}

/**
 * 获取标签类别的显示信息
 */
export function getLabelTypeInfo(labelType: string): {
  name: string
  color: string
  icon: string
} {
  switch (labelType) {
    case 'wealth':
      return { name: '资产规模', color: 'yellow', icon: '💰' }
    case 'defi':
      return { name: 'DeFi 活动', color: 'blue', icon: '🚀' }
    case 'nft':
      return { name: 'NFT 收藏', color: 'purple', icon: '🎨' }
    case 'activity':
      return { name: '活跃度', color: 'green', icon: '⚡' }
    case 'behavior':
      return { name: '行为特征', color: 'indigo', icon: '📊' }
    default:
      return { name: '其他', color: 'gray', icon: '🏷️' }
  }
}
