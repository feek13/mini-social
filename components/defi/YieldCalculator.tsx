'use client'

import { useState } from 'react'
import { Calculator, TrendingUp, DollarSign, Calendar, Percent, Info } from 'lucide-react'
import { calculateYieldReturn } from '@/lib/utils'

interface YieldCalculatorProps {
  defaultApy?: number
  defaultPrincipal?: number
}

export default function YieldCalculator({ defaultApy = 10, defaultPrincipal = 10000 }: YieldCalculatorProps) {
  const [principal, setPrincipal] = useState<number>(defaultPrincipal)
  const [apy, setApy] = useState<number>(defaultApy)
  const [days, setDays] = useState<number>(365)
  const [compound, setCompound] = useState<boolean>(true)

  // 计算收益
  const result = calculateYieldReturn(principal, apy, days, compound)

  // 预设时间选项
  const timePresets = [
    { label: '7天', days: 7 },
    { label: '30天', days: 30 },
    { label: '90天', days: 90 },
    { label: '180天', days: 180 },
    { label: '1年', days: 365 },
  ]

  // 预设本金选项
  const principalPresets = [1000, 5000, 10000, 50000, 100000]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* 标题 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Calculator className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">收益计算器</h3>
          <p className="text-sm text-gray-500">计算您的预期收益</p>
        </div>
      </div>

      {/* 输入区域 */}
      <div className="space-y-4 mb-6">
        {/* 本金输入 */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <DollarSign className="w-4 h-4" />
            投资本金 (USD)
          </label>
          <input
            type="number"
            value={principal}
            onChange={(e) => setPrincipal(parseFloat(e.target.value) || 0)}
            min="0"
            step="100"
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-lg"
          />
          {/* 快捷选择 */}
          <div className="flex flex-wrap gap-2 mt-2">
            {principalPresets.map((amount) => (
              <button
                key={amount}
                onClick={() => setPrincipal(amount)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                  principal === amount
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                ${amount.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* APY 输入 */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Percent className="w-4 h-4" />
            年化收益率 (APY %)
          </label>
          <input
            type="number"
            value={apy}
            onChange={(e) => setApy(parseFloat(e.target.value) || 0)}
            min="0"
            step="0.1"
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-lg"
          />
        </div>

        {/* 投资期限 */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4" />
            投资期限（天）
          </label>
          <input
            type="number"
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value) || 0)}
            min="1"
            step="1"
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-lg"
          />
          {/* 快捷选择 */}
          <div className="flex flex-wrap gap-2 mt-2">
            {timePresets.map((preset) => (
              <button
                key={preset.days}
                onClick={() => setDays(preset.days)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                  days === preset.days
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* 复利开关 */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">启用复利计算</span>
            <div className="group relative">
              <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                复利模式下收益会每日复投，产生更高的总收益
              </div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={compound}
              onChange={(e) => setCompound(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>
      </div>

      {/* 计算结果 */}
      <div className="p-5 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border-2 border-green-200">
        <div className="space-y-4">
          {/* 预期收益 */}
          <div>
            <p className="text-sm text-gray-600 mb-1">预期收益</p>
            <p className="text-4xl font-black text-green-600">
              ${result.return.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* 最终金额 */}
          <div className="flex items-center justify-between pt-4 border-t border-green-200">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">最终金额</p>
              <p className="text-2xl font-bold text-gray-900">
                ${result.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-0.5">收益率</p>
              <p className="text-xl font-bold text-blue-600">
                +{((result.return / principal) * 100).toFixed(2)}%
              </p>
            </div>
          </div>

          {/* 说明 */}
          <div className="pt-3 border-t border-green-200">
            <p className="text-xs text-gray-600 leading-relaxed">
              {compound ? (
                <>
                  使用 <span className="font-semibold text-green-700">复利模式</span>，
                  每日收益自动复投，年化收益率 <span className="font-semibold">{apy}%</span>，
                  投资期限 <span className="font-semibold">{days} 天</span>
                </>
              ) : (
                <>
                  使用 <span className="font-semibold text-blue-700">单利模式</span>，
                  年化收益率 <span className="font-semibold">{apy}%</span>，
                  投资期限 <span className="font-semibold">{days} 天</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* 免责声明 */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-xs text-yellow-800 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            此计算器仅供参考，实际收益可能因市场波动、费用、无常损失等因素而有所不同。请谨慎投资。
          </span>
        </p>
      </div>
    </div>
  )
}
