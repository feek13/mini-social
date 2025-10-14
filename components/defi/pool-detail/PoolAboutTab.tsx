'use client'

import { ExternalLink, Shield, Link as LinkIcon, Github, Twitter, FileText, AlertCircle } from 'lucide-react'
import { YieldPool } from '@/lib/defillama/types'
import { getPoolInvestUrl } from '@/lib/defi-utils'

interface PoolAboutTabProps {
  pool: YieldPool
}

export default function PoolAboutTab({ pool }: PoolAboutTabProps) {
  return (
    <div className="space-y-6">
      {/* 协议基本信息 */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">协议信息</h3>
        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">协议名称</p>
              <p className="text-lg font-bold text-gray-900">{pool.project}</p>
            </div>
            <a
              href={getPoolInvestUrl(pool)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition"
            >
              <span>访问官网</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-600 mb-1">部署链</p>
              <p className="text-base font-semibold text-gray-900">{pool.chain}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">代币对</p>
              <p className="text-base font-semibold text-gray-900">{pool.symbol}</p>
            </div>
            {pool.poolMeta && (
              <div>
                <p className="text-sm text-gray-600 mb-1">池子类型</p>
                <p className="text-base font-semibold text-gray-900">{pool.poolMeta}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600 mb-1">资产类型</p>
              <p className="text-base font-semibold text-gray-900">
                {pool.exposure === 'single' ? '单一资产' : '多资产组合'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 底层代币信息 */}
      {pool.underlyingTokens && pool.underlyingTokens.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">底层代币</h3>
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="space-y-2">
              {pool.underlyingTokens.map((token, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-gray-600 truncate">{token}</p>
                  </div>
                  <a
                    href={`https://etherscan.io/address/${token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600 transition"
                    title="在区块浏览器中查看"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 奖励代币信息 */}
      {pool.rewardTokens && pool.rewardTokens.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">奖励代币</h3>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
            <div className="space-y-2">
              {pool.rewardTokens.map((token, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-200"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                    🎁
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{token}</p>
                  </div>
                  <a
                    href={`https://etherscan.io/token/${token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-700 transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 风险信息 */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">风险信息</h3>
        <div className="space-y-3">
          {/* IL 风险 */}
          <div className={`p-4 rounded-lg border ${
            pool.ilRisk === 'no'
              ? 'bg-green-50 border-green-200'
              : pool.ilRisk === 'yes'
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Shield className={`w-5 h-5 ${
                pool.ilRisk === 'no' ? 'text-green-600' : pool.ilRisk === 'yes' ? 'text-yellow-600' : 'text-gray-600'
              }`} />
              <span className="font-semibold text-gray-900">无常损失风险</span>
            </div>
            <p className="text-sm text-gray-700">
              {pool.ilRisk === 'no' && '此池子无无常损失风险，适合稳健投资者'}
              {pool.ilRisk === 'yes' && '此池子存在无常损失风险，价格波动可能影响收益'}
              {pool.ilRisk === 'unknown' && '无常损失风险状态未知，请谨慎评估'}
            </p>
            {pool.il7d !== null && (
              <p className="text-xs text-gray-600 mt-2">
                7天无常损失: {pool.il7d.toFixed(2)}%
              </p>
            )}
          </div>

          {/* 异常值警告 */}
          {pool.outlier && (
            <div className="p-4 rounded-lg border bg-orange-50 border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <span className="font-semibold text-gray-900">数据异常提示</span>
              </div>
              <p className="text-sm text-gray-700">
                此池子的 APY 数据被标记为异常值，可能存在数据错误或极端市场情况。建议谨慎评估。
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 统计信息 */}
      {(pool.mu !== null || pool.sigma !== null) && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">统计特征</h3>
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {pool.mu !== null && (
                <div className="text-center">
                  <p className="text-xs text-gray-600 mb-1">平均值 (μ)</p>
                  <p className="text-xl font-bold text-gray-900">{pool.mu.toFixed(2)}</p>
                </div>
              )}
              {pool.sigma !== null && (
                <div className="text-center">
                  <p className="text-xs text-gray-600 mb-1">标准差 (σ)</p>
                  <p className="text-xl font-bold text-gray-900">{pool.sigma.toFixed(2)}</p>
                </div>
              )}
              {pool.count !== null && (
                <div className="text-center">
                  <p className="text-xs text-gray-600 mb-1">数据点数</p>
                  <p className="text-xl font-bold text-gray-900">{pool.count}</p>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 text-center mt-4">
              基于历史数据的统计分析，用于评估波动性和稳定性
            </p>
          </div>
        </div>
      )}

      {/* 数据来源 */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">数据来源</p>
            <p className="text-xs text-gray-700">
              所有数据来自 <a href="https://defillama.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">DeFiLlama</a>，
              实时更新，仅供参考。投资前请务必自行研究并评估风险。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
