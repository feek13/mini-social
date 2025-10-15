'use client'

/**
 * Gas Tracker 详情页面
 * 显示实时 Gas 价格、历史趋势、Gas 计算器
 */

import { useEffect, useState } from 'react'
import { Fuel, TrendingUp, Calculator, Clock, AlertCircle } from 'lucide-react'
import Breadcrumb from '@/components/Breadcrumb'

interface GasPrice {
  lastBlock: number
  safe: number
  propose: number
  fast: number
  baseFee: number
  gasUsedRatio: number
  timestamp: number
  level: {
    level: 'low' | 'medium' | 'high' | 'extreme'
    color: string
    emoji: string
  }
}

interface GasHistoryItem {
  date: string
  avgGasPrice: number
}

const COMMON_TRANSACTIONS = [
  { name: 'ETH 转账', gasLimit: 21000 },
  { name: 'ERC20 转账', gasLimit: 65000 },
  { name: 'Uniswap Swap', gasLimit: 150000 },
  { name: 'Aave 存款', gasLimit: 200000 },
  { name: 'NFT Mint', gasLimit: 100000 },
  { name: 'OpenSea 挂单', gasLimit: 80000 },
]

export default function GasPage() {
  const [gasPrice, setGasPrice] = useState<GasPrice | null>(null)
  const [history, setHistory] = useState<GasHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTx, setSelectedTx] = useState(COMMON_TRANSACTIONS[0])
  const [ethPrice] = useState(3000) // 简化：固定 ETH 价格，实际应从 API 获取

  // 获取实时 Gas 价格
  const fetchGasPrice = async () => {
    try {
      const response = await fetch('/api/etherscan/gas/oracle')
      const result = await response.json()

      if (result.success) {
        setGasPrice(result.data)
      }
    } catch (error) {
      console.error('获取 Gas 价格失败:', error)
    }
  }

  // 获取历史数据
  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/etherscan/gas/history?days=7')
      const result = await response.json()

      if (result.success) {
        setHistory(result.data.history)
      }
    } catch (error) {
      console.error('获取历史数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGasPrice()
    fetchHistory()

    // 每 2 分钟刷新 Gas 价格
    const interval = setInterval(fetchGasPrice, 2 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  // 计算 Gas 费用
  const calculateGasFee = (gasLimit: number, gasPriceGwei: number) => {
    const gasFeeETH = (gasLimit * gasPriceGwei) / 1e9
    const gasFeeUSD = gasFeeETH * ethPrice
    return { eth: gasFeeETH, usd: gasFeeUSD }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 面包屑 */}
      <Breadcrumb
        items={[
          { label: '首页', href: '/' },
          { label: 'Gas Tracker' },
        ]}
      />

      {/* 页面标题 */}
      <div className="flex items-center gap-3 mb-8">
        <Fuel className="w-8 h-8 text-blue-500" />
        <h1 className="text-3xl font-bold text-gray-900">Gas Tracker</h1>
      </div>

      {/* 实时 Gas 价格卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {gasPrice && (
          <>
            {/* 慢速 */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-700 font-medium">慢速</span>
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-900 mb-1">
                {gasPrice.safe} <span className="text-lg font-normal">gwei</span>
              </div>
              <p className="text-sm text-green-700">~5 分钟</p>
            </div>

            {/* 标准 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-700 font-medium">标准</span>
                <span className="text-2xl">{gasPrice.level.emoji}</span>
              </div>
              <div className="text-3xl font-bold text-blue-900 mb-1">
                {gasPrice.propose} <span className="text-lg font-normal">gwei</span>
              </div>
              <p className="text-sm text-blue-700">~2 分钟</p>
            </div>

            {/* 快速 */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-700 font-medium">快速</span>
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-purple-900 mb-1">
                {gasPrice.fast} <span className="text-lg font-normal">gwei</span>
              </div>
              <p className="text-sm text-purple-700">~30 秒</p>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gas 计算器 */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-6">
            <Calculator className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold text-gray-900">Gas 费用计算器</h2>
          </div>

          {/* 选择交易类型 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择交易类型
            </label>
            <div className="grid grid-cols-2 gap-3">
              {COMMON_TRANSACTIONS.map((tx) => (
                <button
                  key={tx.name}
                  onClick={() => setSelectedTx(tx)}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    selectedTx.name === tx.name
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="font-medium">{tx.name}</div>
                  <div className="text-xs text-gray-500">{tx.gasLimit.toLocaleString()} gas</div>
                </button>
              ))}
            </div>
          </div>

          {/* 费用预估 */}
          {gasPrice && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">预估费用</h3>

              {[
                { label: '慢速', price: gasPrice.safe },
                { label: '标准', price: gasPrice.propose },
                { label: '快速', price: gasPrice.fast },
              ].map(({ label, price }) => {
                const fee = calculateGasFee(selectedTx.gasLimit, price)
                return (
                  <div
                    key={label}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-gray-700">{label}</span>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {fee.eth.toFixed(6)} ETH
                      </div>
                      <div className="text-sm text-gray-500">
                        ≈ ${fee.usd.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 7 天历史趋势 */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold text-gray-900">7 天平均 Gas 价格</h2>
          </div>

          {history.length > 0 ? (
            <div className="space-y-3">
              {history.map((item, index) => {
                const maxPrice = Math.max(...history.map((h) => h.avgGasPrice))
                const percentage = (item.avgGasPrice / maxPrice) * 100

                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{item.date}</span>
                      <span className="font-semibold text-gray-900">
                        {item.avgGasPrice.toFixed(2)} gwei
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>暂无历史数据</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
