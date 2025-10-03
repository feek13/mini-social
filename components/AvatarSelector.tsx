'use client'

import { AVATAR_STYLES, getAvatarUrl } from '@/lib/avatar'

interface AvatarSelectorProps {
  username: string           // 用于生成预览
  selectedTemplate: string   // 当前选中的模版
  onSelect: (template: string) => void
}

export default function AvatarSelector({
  username,
  selectedTemplate,
  onSelect,
}: AvatarSelectorProps) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
        {AVATAR_STYLES.map((style) => {
          const isSelected = selectedTemplate === style.id
          const avatarUrl = getAvatarUrl(style.id, username)

          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onSelect(style.id)}
              className="flex flex-col items-center gap-2 group focus:outline-none"
              aria-label={`选择${style.name}头像`}
            >
              {/* 头像容器 */}
              <div
                className={`
                  relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-gray-100
                  transition-all duration-200
                  ${isSelected
                    ? 'ring-[3px] ring-blue-500 shadow-lg scale-105'
                    : 'ring-0 group-hover:ring-2 group-hover:ring-blue-300 group-hover:shadow-md group-hover:scale-105'
                  }
                `}
              >
                <img
                  src={avatarUrl}
                  alt={style.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* 头像名称 */}
              <span
                className={`
                  text-[10px] sm:text-xs text-center font-medium transition-colors duration-200
                  ${isSelected
                    ? 'text-blue-600'
                    : 'text-gray-600 group-hover:text-blue-500'
                  }
                `}
              >
                {style.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
