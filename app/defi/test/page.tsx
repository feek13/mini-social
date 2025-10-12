/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
'use client'

import { useState } from 'react'

export default function DefiTestPage() {
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<string>('')

  const testApi = async (endpoint: string, label: string) => {
    setLoading(label)
    setError('')
    setResult(null)

    try {
      const response = await fetch(endpoint)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setLoading('')
    }
  }

  const testProtocolPrice = async () => {
    setLoading('测试批量价格查询')
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/defi/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokens: [
            { chain: 'ethereum', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' }, // WETH
            { chain: 'ethereum', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' }, // USDC
            { chain: 'polygon', address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270' }, // WMATIC
          ],
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setLoading('')
    }
  }

  const tests = [
    {
      label: '获取协议列表（前3个）',
      endpoint: '/api/defi/protocols?limit=3',
    },
    {
      label: '搜索 Aave 协议',
      endpoint: '/api/defi/protocols?search=aave&limit=2',
    },
    {
      label: '获取 Lending 分类协议',
      endpoint: '/api/defi/protocols?category=Lending&limit=3',
    },
    {
      label: '获取 Lido 协议详情',
      endpoint: '/api/defi/protocols/lido',
    },
    {
      label: '获取收益率列表（前3个）',
      endpoint: '/api/defi/yields?limit=3',
    },
    {
      label: '获取 Aave 的收益率',
      endpoint: '/api/defi/yields?protocol=aave&limit=5',
    },
    {
      label: '获取 Ethereum 上 Aave 的收益率',
      endpoint: '/api/defi/yields?chain=Ethereum&protocol=aave&limit=3',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">DeFi API 测试页面</h1>

        {/* 测试按钮区域 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">测试按钮</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tests.map((test) => (
              <button
                key={test.label}
                onClick={() => testApi(test.endpoint, test.label)}
                disabled={!!loading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm transition-colors"
              >
                {loading === test.label ? '加载中...' : test.label}
              </button>
            ))}
            <button
              onClick={testProtocolPrice}
              disabled={!!loading}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm transition-colors"
            >
              {loading === '测试批量价格查询' ? '加载中...' : '测试批量价格查询'}
            </button>
          </div>
        </div>

        {/* 错误展示区域 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">错误信息</h2>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* 结果展示区域 */}
        {result && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">API 返回结果</h2>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(result, null, 2))
                  alert('已复制到剪贴板')
                }}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
              >
                复制 JSON
              </button>
            </div>

            {/* JSON 展示 */}
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-[600px]">
              <pre className="text-sm">
                <code>{JSON.stringify(result, null, 2)}</code>
              </pre>
            </div>

            {/* 可视化展示 */}
            {result.data && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">可视化展示</h3>

                {/* 协议列表 */}
                {Array.isArray(result.data) && result.data[0]?.name && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {result.data.map((protocol: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start space-x-3">
                          {protocol.logo && (
                            <img
                              src={protocol.logo}
                              alt={protocol.name}
                              className="w-12 h-12 rounded-full"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate">
                              {protocol.name}
                            </h4>
                            {protocol.category && (
                              <p className="text-sm text-gray-600">{protocol.category}</p>
                            )}
                            {protocol.tvl !== undefined && (
                              <p className="text-sm font-medium text-green-600">
                                TVL: ${(protocol.tvl / 1e9).toFixed(2)}B
                              </p>
                            )}
                            {protocol.chains && (
                              <p className="text-xs text-gray-500 mt-1">
                                {protocol.chains.slice(0, 3).join(', ')}
                                {protocol.chains.length > 3 && '...'}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 收益率列表 */}
                {Array.isArray(result.data) && result.data[0]?.apy !== undefined && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Protocol
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Symbol
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Chain
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            APY
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            TVL
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {result.data.map((pool: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {pool.project}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {pool.symbol}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {pool.chain}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                              {pool.apy?.toFixed(2)}%
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-600">
                              ${(pool.tvlUsd / 1e6).toFixed(2)}M
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 价格列表 */}
                {result.data?.prices && (
                  <div className="space-y-3">
                    {Object.entries(result.data.prices).map(([key, priceData]: [string, any]) => (
                      <div key={key} className="border rounded-lg p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{key}</p>
                          {priceData.symbol && (
                            <p className="text-sm text-gray-600">{priceData.symbol}</p>
                          )}
                          {priceData.confidence && (
                            <p className="text-xs text-gray-500">
                              Confidence: {priceData.confidence.toFixed(2)}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">
                            ${priceData.price.toFixed(2)}
                          </p>
                          {priceData.timestamp && (
                            <p className="text-xs text-gray-500">
                              {new Date(priceData.timestamp * 1000).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 协议详情 */}
                {result.data?.name && !Array.isArray(result.data) && (
                  <div className="border rounded-lg p-6">
                    <div className="flex items-start space-x-4 mb-4">
                      {result.data.logo && (
                        <img
                          src={result.data.logo}
                          alt={result.data.name}
                          className="w-20 h-20 rounded-full"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="text-2xl font-bold text-gray-900 mb-2">
                          {result.data.name}
                        </h4>
                        {result.data.category && (
                          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                            {result.data.category}
                          </span>
                        )}
                      </div>
                    </div>

                    {result.data.description && (
                      <p className="text-gray-700 mb-4">{result.data.description}</p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {result.data.tvl !== undefined && (
                        <div className="bg-green-50 rounded-lg p-3">
                          <p className="text-sm text-gray-600">TVL</p>
                          <p className="text-xl font-bold text-green-600">
                            ${(result.data.tvl / 1e9).toFixed(2)}B
                          </p>
                        </div>
                      )}
                      {result.data.chainTvls && Object.keys(result.data.chainTvls).length > 0 && (
                        <div className="bg-blue-50 rounded-lg p-3">
                          <p className="text-sm text-gray-600">Chains</p>
                          <p className="text-xl font-bold text-blue-600">
                            {Object.keys(result.data.chainTvls).length}
                          </p>
                        </div>
                      )}
                    </div>

                    {result.data.url && (
                      <a
                        href={result.data.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        Visit Website →
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 空状态 */}
        {!result && !error && !loading && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-500 text-lg">点击上方按钮开始测试</p>
          </div>
        )}
      </div>
    </div>
  )
}
