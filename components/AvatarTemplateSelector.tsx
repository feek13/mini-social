'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AVATAR_STYLES, getAvatarUrl } from '@/lib/avatar'

interface AvatarTemplateSelectorProps {
  selected?: string
  username?: string
  onSelect: (templateId: string) => void
}

export default function AvatarTemplateSelector({
  selected,
  username,
  onSelect,
}: AvatarTemplateSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        选择头像风格
      </label>
      <div className="grid grid-cols-5 gap-4">
        {AVATAR_STYLES.map((style) => {
          const avatarUrl = getAvatarUrl(style.id, username || 'preview')

          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onSelect(style.id)}
              className={cn(
                'relative flex flex-col items-center gap-2 p-2 rounded-xl transition-all hover:scale-105',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                selected === style.id && 'ring-2 ring-blue-500 ring-offset-2 bg-blue-50'
              )}
            >
              {/* 头像预览 */}
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                <img
                  src={avatarUrl}
                  alt={style.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* 选中标记 */}
              {selected === style.id && (
                <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-1">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}

              {/* 模版名称 */}
              <div className="text-xs text-center text-gray-700 font-medium">
                {style.preview} {style.name}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { AVATAR_STYLES }
