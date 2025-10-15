/**
 * 钱包地址验证工具
 *
 * 使用 EIP-191 标准进行签名验证
 * 参考：https://eips.ethereum.org/EIPS/eip-191
 */

import { verifyMessage } from 'viem'

/**
 * 生成待签名的消息
 *
 * @param address - 钱包地址
 * @param username - 用户名
 * @returns 待签名的消息字符串
 */
export function generateVerificationMessage(address: string, username: string): string {
  const timestamp = new Date().toISOString()
  const nonce = Math.random().toString(36).substring(7)

  return `Welcome to MiniSocial!

Sign this message to verify your wallet ownership.

Wallet: ${address}
Username: ${username}
Timestamp: ${timestamp}
Nonce: ${nonce}

This request will not trigger a blockchain transaction or cost any gas fees.`
}

/**
 * 验证签名是否有效
 *
 * @param address - 声称的钱包地址
 * @param message - 原始消息
 * @param signature - 签名数据
 * @returns 签名是否有效
 */
export async function verifyWalletSignature(
  address: string,
  message: string,
  signature: `0x${string}`
): Promise<boolean> {
  try {
    // 使用 viem 的 verifyMessage 函数验证签名
    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature,
    })

    return isValid
  } catch (error) {
    console.error('签名验证失败:', error)
    return false
  }
}

/**
 * 规范化钱包地址（转为小写）
 *
 * @param address - 钱包地址
 * @returns 小写的钱包地址
 */
export function normalizeAddress(address: string): string {
  return address.toLowerCase()
}

/**
 * 验证钱包地址格式是否正确
 *
 * @param address - 钱包地址
 * @returns 地址格式是否正确
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * 生成钱包验证会话数据
 * 用于存储在前端，避免重复生成消息
 *
 * @param address - 钱包地址
 * @param username - 用户名
 * @returns 会话数据对象
 */
export interface VerificationSession {
  address: string
  username: string
  message: string
  timestamp: number
}

export function createVerificationSession(
  address: string,
  username: string
): VerificationSession {
  return {
    address: normalizeAddress(address),
    username,
    message: generateVerificationMessage(address, username),
    timestamp: Date.now(),
  }
}

/**
 * 检查验证会话是否过期
 *
 * @param session - 验证会话
 * @param maxAgeMs - 最大有效期（毫秒），默认 5 分钟
 * @returns 会话是否过期
 */
export function isSessionExpired(
  session: VerificationSession,
  maxAgeMs: number = 5 * 60 * 1000
): boolean {
  return Date.now() - session.timestamp > maxAgeMs
}
