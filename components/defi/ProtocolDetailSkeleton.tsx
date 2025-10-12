'use client'

import React from 'react'

export default function ProtocolDetailSkeleton() {
  return (
    <div className="animate-pulse">
      {/* 头部骨架 */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-800" />
          <div className="flex-1 space-y-3">
            <div className="h-8 bg-gray-800 rounded w-1/3" />
            <div className="h-4 bg-gray-800 rounded w-1/4" />
            <div className="h-4 bg-gray-800 rounded w-full" />
            <div className="h-4 bg-gray-800 rounded w-2/3" />
          </div>
        </div>
      </div>

      {/* Tab 骨架 */}
      <div className="mb-6 bg-gray-900 rounded-xl border border-gray-800 p-2">
        <div className="flex gap-2">
          <div className="h-10 bg-gray-800 rounded-lg w-32" />
          <div className="h-10 bg-gray-800 rounded-lg w-32" />
          <div className="h-10 bg-gray-800 rounded-lg w-32" />
        </div>
      </div>

      {/* 图表骨架 */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
        <div className="h-6 bg-gray-800 rounded w-1/4 mb-4" />
        <div className="h-[400px] bg-gray-800 rounded" />
      </div>

      {/* 指标卡片骨架 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <div className="h-4 bg-gray-800 rounded w-1/2 mb-3" />
            <div className="h-8 bg-gray-800 rounded w-2/3 mb-2" />
            <div className="h-3 bg-gray-800 rounded w-1/3" />
          </div>
        ))}
      </div>
    </div>
  )
}
