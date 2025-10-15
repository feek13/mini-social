/**
 * 用户声誉评分计算器
 * 综合链上数据、DeFi 参与度和社交活动计算声誉分数
 */

import type { ReputationLevel } from '@/types/database'
import type { WalletStats } from '../etherscan'
import type { UserStats } from '@/types/database'

// ============================================
// 类型定义
// ============================================

// 评分维度
export interface ScoreDimensions {
  walletAgeScore: number // 钱包年龄得分 (0-20)
  activityScore: number // 活跃度得分 (0-25)
  defiScore: number // DeFi 参与度得分 (0-30)
  assetScore: number // 资产规模得分 (0-15)
  socialScore: number // 社交活动得分 (0-10)
}

// 评分结果
export interface ReputationScore {
  totalScore: number // 总分 (0-100)
  level: ReputationLevel // 等级
  dimensions: ScoreDimensions // 各维度得分
  metadata: {
    walletAgeDays: number
    txCount: number
    protocolCount: number
    ethBalance: number
    postsCount: number
    followersCount: number
  }
}

// 计算选项
export interface CalculatorOptions {
  walletStats?: WalletStats
  socialStats?: UserStats
  skipWalletData?: boolean // 如果钱包未验证，跳过钱包相关评分
}

// ============================================
// 评分权重配置
// ============================================

const WEIGHTS = {
  WALLET_AGE: 0.2, // 20%
  ACTIVITY: 0.25, // 25%
  DEFI: 0.3, // 30%
  ASSET: 0.15, // 15%
  SOCIAL: 0.1, // 10%
}

// ============================================
// 声誉等级映射
// ============================================

const LEVEL_THRESHOLDS: Array<{ min: number; level: ReputationLevel }> = [
  { min: 80, level: 'Legend' },
  { min: 60, level: 'Diamond' },
  { min: 40, level: 'Gold' },
  { min: 20, level: 'Silver' },
  { min: 0, level: 'Bronze' },
]

// ============================================
// 声誉计算器类
// ============================================

export class ReputationCalculator {
  /**
   * 计算用户声誉分数
   */
  static calculateReputation(options: CalculatorOptions): ReputationScore {
    const {
      walletStats,
      socialStats,
      skipWalletData = false,
    } = options

    // 计算各维度得分
    const dimensions: ScoreDimensions = {
      walletAgeScore: skipWalletData
        ? 0
        : this.calculateWalletAgeScore(walletStats?.walletAgeDays || 0),
      activityScore: skipWalletData
        ? 0
        : this.calculateActivityScore(walletStats?.normalTxCount || 0),
      defiScore: skipWalletData
        ? 0
        : this.calculateDeFiScore(walletStats?.defiProtocols.length || 0),
      assetScore: skipWalletData
        ? 0
        : this.calculateAssetScore(walletStats?.ethBalanceFormatted || 0),
      socialScore: this.calculateSocialScore(socialStats),
    }

    // 计算总分
    const totalScore =
      dimensions.walletAgeScore +
      dimensions.activityScore +
      dimensions.defiScore +
      dimensions.assetScore +
      dimensions.socialScore

    // 确保总分在 0-100 范围内
    const clampedScore = Math.max(0, Math.min(100, Math.round(totalScore)))

    // 确定等级
    const level = this.determineLevel(clampedScore)

    return {
      totalScore: clampedScore,
      level,
      dimensions,
      metadata: {
        walletAgeDays: walletStats?.walletAgeDays || 0,
        txCount: walletStats?.normalTxCount || 0,
        protocolCount: walletStats?.defiProtocols.length || 0,
        ethBalance: walletStats?.ethBalanceFormatted || 0,
        postsCount: socialStats?.postsCount || 0,
        followersCount: socialStats?.followersCount || 0,
      },
    }
  }

  /**
   * 计算钱包年龄得分 (0-20分)
   * 权重：20%
   *
   * 评分标准：
   * - 0-30天：0-5分
   * - 31-90天：5-10分
   * - 91-365天：10-15分
   * - 365天以上：15-20分（每年+1分，最多20分）
   */
  private static calculateWalletAgeScore(ageDays: number): number {
    if (ageDays === 0) return 0

    if (ageDays < 30) {
      // 0-1个月: 0-5分
      return (ageDays / 30) * 5
    }

    if (ageDays < 90) {
      // 1-3个月: 5-10分
      return 5 + ((ageDays - 30) / 60) * 5
    }

    if (ageDays < 365) {
      // 3-12个月: 10-15分
      return 10 + ((ageDays - 90) / 275) * 5
    }

    // 1年以上: 15-20分（每年+1分，最多20分）
    const years = ageDays / 365
    return Math.min(20, 15 + years)
  }

  /**
   * 计算活跃度得分 (0-25分)
   * 权重：25%
   *
   * 评分标准：
   * - 0-10笔：0-5分
   * - 11-50笔：5-10分
   * - 51-100笔：10-15分
   * - 101-500笔：15-20分
   * - 500笔以上：20-25分
   */
  private static calculateActivityScore(txCount: number): number {
    if (txCount === 0) return 0

    if (txCount <= 10) {
      return (txCount / 10) * 5
    }

    if (txCount <= 50) {
      return 5 + ((txCount - 10) / 40) * 5
    }

    if (txCount <= 100) {
      return 10 + ((txCount - 50) / 50) * 5
    }

    if (txCount <= 500) {
      return 15 + ((txCount - 100) / 400) * 5
    }

    // 500笔以上
    return Math.min(25, 20 + Math.log10(txCount / 500) * 5)
  }

  /**
   * 计算 DeFi 参与度得分 (0-30分)
   * 权重：30%
   *
   * 评分标准：
   * - 0个协议：0分
   * - 1个协议：10分
   * - 2个协议：15分
   * - 3个协议：20分
   * - 4个协议：25分
   * - 5个及以上：30分
   */
  private static calculateDeFiScore(protocolCount: number): number {
    if (protocolCount === 0) return 0
    if (protocolCount === 1) return 10
    if (protocolCount === 2) return 15
    if (protocolCount === 3) return 20
    if (protocolCount === 4) return 25
    return 30 // 5+ 协议
  }

  /**
   * 计算资产规模得分 (0-15分)
   * 权重：15%
   *
   * 评分标准（基于 ETH 余额）：
   * - 0 ETH：0分
   * - 0-0.1 ETH：3分
   * - 0.1-1 ETH：6分
   * - 1-10 ETH：9分
   * - 10-100 ETH：12分
   * - 100+ ETH：15分
   */
  private static calculateAssetScore(ethBalance: number): number {
    if (ethBalance === 0) return 0
    if (ethBalance < 0.1) return 3
    if (ethBalance < 1) return 6
    if (ethBalance < 10) return 9
    if (ethBalance < 100) return 12
    return 15 // 100+ ETH
  }

  /**
   * 计算社交活动得分 (0-10分)
   * 权重：10%
   *
   * 评分标准：
   * - 动态数量：0-5分
   * - 粉丝数量：0-5分
   */
  private static calculateSocialScore(socialStats?: UserStats): number {
    if (!socialStats) return 0

    // 动态数量得分 (0-5分)
    let postsScore = 0
    const postsCount = socialStats.postsCount || 0
    if (postsCount >= 100) postsScore = 5
    else if (postsCount >= 50) postsScore = 4
    else if (postsCount >= 20) postsScore = 3
    else if (postsCount >= 10) postsScore = 2
    else if (postsCount >= 5) postsScore = 1

    // 粉丝数量得分 (0-5分)
    let followersScore = 0
    const followersCount = socialStats.followersCount || 0
    if (followersCount >= 1000) followersScore = 5
    else if (followersCount >= 500) followersScore = 4
    else if (followersCount >= 100) followersScore = 3
    else if (followersCount >= 50) followersScore = 2
    else if (followersCount >= 10) followersScore = 1

    return postsScore + followersScore
  }

  /**
   * 根据总分确定等级
   */
  private static determineLevel(score: number): ReputationLevel {
    for (const threshold of LEVEL_THRESHOLDS) {
      if (score >= threshold.min) {
        return threshold.level
      }
    }
    return 'Bronze'
  }

  /**
   * 获取等级信息
   */
  static getLevelInfo(level: ReputationLevel): {
    emoji: string
    color: string
    name: string
    description: string
  } {
    const levelInfo: Record<
      ReputationLevel,
      { emoji: string; color: string; name: string; description: string }
    > = {
      Bronze: {
        emoji: '🥉',
        color: 'text-orange-600',
        name: '青铜',
        description: '刚刚开始 Web3 旅程',
      },
      Silver: {
        emoji: '🥈',
        color: 'text-gray-400',
        name: '白银',
        description: '有一定链上经验',
      },
      Gold: {
        emoji: '🥇',
        color: 'text-yellow-500',
        name: '黄金',
        description: '活跃的 DeFi 用户',
      },
      Diamond: {
        emoji: '💎',
        color: 'text-blue-500',
        name: '钻石',
        description: '资深 DeFi 玩家',
      },
      Legend: {
        emoji: '🏆',
        color: 'text-purple-600',
        name: '传奇',
        description: 'Web3 领域专家',
      },
    }

    return levelInfo[level]
  }

  /**
   * 获取下一等级信息
   */
  static getNextLevelInfo(currentScore: number): {
    nextLevel: ReputationLevel | null
    scoreNeeded: number
    progress: number // 0-100 百分比
  } {
    // 找到当前等级
    const currentLevelIndex = LEVEL_THRESHOLDS.findIndex(
      (t) => currentScore >= t.min
    )

    if (currentLevelIndex === -1 || currentLevelIndex === 0) {
      // 已经是最高等级
      return {
        nextLevel: null,
        scoreNeeded: 0,
        progress: 100,
      }
    }

    // 获取下一等级
    const nextLevelThreshold = LEVEL_THRESHOLDS[currentLevelIndex - 1]
    const currentLevelThreshold = LEVEL_THRESHOLDS[currentLevelIndex]

    const scoreNeeded = nextLevelThreshold.min - currentScore
    const progress =
      ((currentScore - currentLevelThreshold.min) /
        (nextLevelThreshold.min - currentLevelThreshold.min)) *
      100

    return {
      nextLevel: nextLevelThreshold.level,
      scoreNeeded,
      progress: Math.round(progress),
    }
  }

  /**
   * 格式化分数显示
   */
  static formatScore(score: number): string {
    return score.toFixed(0)
  }

  /**
   * 生成分数建议
   */
  static getScoreRecommendations(
    score: ReputationScore
  ): Array<{ category: string; suggestion: string; impact: string }> {
    const recommendations: Array<{
      category: string
      suggestion: string
      impact: string
    }> = []

    // 钱包年龄建议
    if (score.dimensions.walletAgeScore < 10) {
      recommendations.push({
        category: '钱包年龄',
        suggestion: '继续使用钱包积累经验',
        impact: `+${(20 - score.dimensions.walletAgeScore).toFixed(0)} 分潜力`,
      })
    }

    // 活跃度建议
    if (score.dimensions.activityScore < 15) {
      recommendations.push({
        category: '活跃度',
        suggestion: '增加链上交易频率',
        impact: `+${(25 - score.dimensions.activityScore).toFixed(0)} 分潜力`,
      })
    }

    // DeFi 参与度建议
    if (score.dimensions.defiScore < 20) {
      recommendations.push({
        category: 'DeFi 参与',
        suggestion: '尝试更多 DeFi 协议（如 Uniswap、Aave、Curve）',
        impact: `+${(30 - score.dimensions.defiScore).toFixed(0)} 分潜力`,
      })
    }

    // 资产规模建议
    if (score.dimensions.assetScore < 9) {
      recommendations.push({
        category: '资产规模',
        suggestion: '增加链上资产配置',
        impact: `+${(15 - score.dimensions.assetScore).toFixed(0)} 分潜力`,
      })
    }

    // 社交活动建议
    if (score.dimensions.socialScore < 8) {
      recommendations.push({
        category: '社交活动',
        suggestion: '发布更多动态，增加粉丝互动',
        impact: `+${(10 - score.dimensions.socialScore).toFixed(0)} 分潜力`,
      })
    }

    return recommendations
  }
}

// ============================================
// 便捷函数
// ============================================

/**
 * 快速计算声誉分数
 */
export function calculateReputation(
  options: CalculatorOptions
): ReputationScore {
  return ReputationCalculator.calculateReputation(options)
}

/**
 * 获取等级信息
 */
export function getLevelInfo(level: ReputationLevel) {
  return ReputationCalculator.getLevelInfo(level)
}

/**
 * 获取下一等级信息
 */
export function getNextLevelInfo(currentScore: number) {
  return ReputationCalculator.getNextLevelInfo(currentScore)
}
