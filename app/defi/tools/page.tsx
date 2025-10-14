'use client'

import { useState, useEffect } from 'react'
import { Calculator, GitCompare, Shield, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import YieldCalculator from '@/components/defi/YieldCalculator'
import RiskBadge, { DetailedRiskBadge } from '@/components/defi/RiskBadge'
import PoolComparison from '@/components/defi/PoolComparison'
import { YieldPool } from '@/lib/defillama/types'

export default function DeFiToolsPage() {
  const [comparisonPools, setComparisonPools] = useState<YieldPool[]>([])
  const [sampleYields, setSampleYields] = useState<YieldPool[]>([])
  const [loading, setLoading] = useState(true)

  // 获取示例收益率数据
  useEffect(() => {
    async function fetchSampleYields() {
      try {
        const response = await fetch('/api/defi/yields?limit=10')
        const data = await response.json()
        if (data.pools && data.pools.length > 0) {
          setSampleYields(data.pools)
          // 默认选择前3个池子用于对比
          setComparisonPools(data.pools.slice(0, 3))
        }
      } catch (error) {
        console.error('获取示例数据失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSampleYields()
  }, [])

  // 移除池子
  const handleRemovePool = (poolId: string) => {
    setComparisonPools(prev => prev.filter(p => p.pool !== poolId))
  }

  // 添加池子
  const handleAddPool = (pool: YieldPool) => {
    if (comparisonPools.length < 3 && !comparisonPools.find(p => p.pool === pool.pool)) {
      setComparisonPools(prev => [...prev, pool])
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 返回链接 */}
        <Link
          href="/defi"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          返回 DeFi 浏览器
        </Link>

        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            DeFi 工具箱
          </h1>
          <p className="text-gray-600">
            专业的 DeFi 投资工具集合
          </p>
        </div>

        <div className="space-y-8">
          {/* 收益计算器 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calculator className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">收益计算器</h2>
                <p className="text-sm text-gray-600">计算您的投资收益（支持复利和单利）</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <YieldCalculator defaultApy={15} defaultPrincipal={10000} />
              <YieldCalculator defaultApy={50} defaultPrincipal={5000} />
            </div>
          </section>

          {/* 风险评分系统 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">风险评分系统</h2>
                <p className="text-sm text-gray-600">智能评估收益率池子的风险等级</p>
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">加载示例数据...</p>
              </div>
            ) : sampleYields.length > 0 ? (
              <>
                {/* 简单徽章示例 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">快速徽章展示</h3>
                  <div className="flex flex-wrap gap-3">
                    {sampleYields.slice(0, 6).map((pool) => (
                      <div key={pool.pool} className="flex flex-col items-start gap-2 p-3 bg-gray-50 rounded-lg">
                        <span className="text-xs text-gray-600 font-medium truncate max-w-[150px]">
                          {pool.project}
                        </span>
                        <RiskBadge pool={pool} size="md" showScore={true} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 详细风险分析 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {sampleYields.slice(0, 2).map((pool) => (
                    <DetailedRiskBadge key={pool.pool} pool={pool} />
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <p className="text-gray-600">暂无示例数据</p>
              </div>
            )}
          </section>

          {/* 池子对比功能 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <GitCompare className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">池子对比</h2>
                <p className="text-sm text-gray-600">并排对比多个收益率池子的关键指标</p>
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">加载示例数据...</p>
              </div>
            ) : (
              <>
                <PoolComparison
                  pools={comparisonPools}
                  onRemovePool={handleRemovePool}
                  maxPools={3}
                />

                {/* 可选择的池子列表 */}
                {sampleYields.length > 0 && comparisonPools.length < 3 && (
                  <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">
                      点击添加池子到对比 (最多 3 个)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {sampleYields
                        .filter(p => !comparisonPools.find(cp => cp.pool === p.pool))
                        .slice(0, 6)
                        .map((pool) => (
                          <button
                            key={pool.pool}
                            onClick={() => handleAddPool(pool)}
                            className="text-left p-4 bg-gray-50 rounded-lg hover:bg-blue-50 hover:border-blue-200 border border-gray-200 transition group"
                          >
                            <p className="font-semibold text-gray-900 group-hover:text-blue-600 truncate">
                              {pool.project}
                            </p>
                            <p className="text-sm text-gray-600 truncate">{pool.symbol}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-500">{pool.chain}</span>
                              <span className="text-lg font-bold text-green-600">
                                {pool.apy.toFixed(2)}%
                              </span>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          {/* 使用说明 */}
          <section className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-bold text-blue-900 mb-3">💡 使用提示</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="font-semibold">•</span>
                <span>
                  <strong>收益计算器</strong>：输入本金、APY和投资期限，支持复利和单利两种计算模式
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">•</span>
                <span>
                  <strong>风险评分</strong>：基于 IL 风险、TVL、APY 和 AI 预测综合评分（0-100）
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">•</span>
                <span>
                  <strong>池子对比</strong>：最多同时对比 3 个池子，查看详细指标差异
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">•</span>
                <span>
                  <strong>数据来源</strong>：所有数据来自 DeFiLlama API，实时更新
                </span>
              </li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}
