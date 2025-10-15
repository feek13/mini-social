/**
 * 声誉系统模块入口
 */

export {
  ReputationCalculator,
  calculateReputation,
  getLevelInfo,
  getNextLevelInfo,
} from './calculator'

export type {
  ScoreDimensions,
  ReputationScore,
  CalculatorOptions,
} from './calculator'
