"use client"

import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ReactNode, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'

interface SwipeablePageTransitionProps {
  children: ReactNode
  enableSwipeBack?: boolean
}

export default function SwipeablePageTransition({
  children,
  enableSwipeBack = true
}: SwipeablePageTransitionProps) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [isDragging, setIsDragging] = useState(false)

  // 拖动位置
  const x = useMotionValue(0)

  // 根据拖动位置计算透明度
  const opacity = useTransform(x, [0, 150], [1, 0.5])

  // 根据拖动位置计算缩放
  const scale = useTransform(x, [0, 150], [1, 0.95])

  const handleDragStart = () => {
    setIsDragging(true)
  }

  const handleDrag = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // 只允许往右拖
    if (info.offset.x < 0) {
      x.set(0)
    }
  }

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false)

    // 往右拖动超过 100px 且速度够快，触发返回
    const shouldGoBack = info.offset.x > 100 || info.velocity.x > 500

    if (shouldGoBack && enableSwipeBack && isMobile) {
      // 触发返回动画
      router.back()
    } else {
      // 回弹
      x.set(0)
    }
  }

  // 只在移动端且允许手势返回时启用拖动
  const shouldEnableDrag = isMobile && enableSwipeBack

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '-100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        x: shouldEnableDrag ? x : 0,
        opacity: shouldEnableDrag ? opacity : 1,
        scale: shouldEnableDrag ? scale : 1,
        willChange: 'transform'
      }}
      drag={shouldEnableDrag ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0, right: 0.5 }}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      className="min-h-screen relative"
    >
      {/* 左侧返回提示（拖动时显示）*/}
      {isDragging && enableSwipeBack && isMobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-50 p-4 text-blue-500"
        >
          <ArrowLeft className="w-8 h-8" />
        </motion.div>
      )}

      {children}
    </motion.div>
  )
}
