/**
 * 地址工具函数
 */

/**
 * 验证以太坊地址格式
 */
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * 格式化地址为小写
 * (简化版，不使用 checksum)
 */
export function formatAddress(address: string): string {
  return address.toLowerCase()
}

/**
 * 缩短地址显示
 * 例如: 0x1234...5678
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!isValidEthereumAddress(address)) {
    return address
  }
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

/**
 * 比较两个地址是否相同（忽略大小写）
 */
export function isSameAddress(address1: string, address2: string): boolean {
  return address1.toLowerCase() === address2.toLowerCase()
}
