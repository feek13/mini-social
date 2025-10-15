/**
 * Moralis API 模块入口
 * 导出客户端和配置
 */

export { moralis } from './client'
export {
  MORALIS_CONFIG,
  CHAIN_CONFIGS,
  DEFAULT_CHAINS,
  getChainConfig,
  getAllChains,
  isChainSupported,
  getChainByMoralisId,
  formatAddress,
  isValidEthereumAddress,
} from './config'
