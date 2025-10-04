export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        {/* 加载动画 - 旋转圆圈 */}
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-gray-200"></div>
          <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin absolute top-0 left-0"></div>
        </div>

        {/* 加载文本 */}
        <p className="text-gray-600 text-sm">
          加载中...
        </p>
      </div>
    </div>
  )
}
