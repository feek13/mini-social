'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <nav className="flex items-center text-sm text-gray-600 mb-4">
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <div key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 mx-1 text-gray-400" />
            )}

            {isLast ? (
              <span className="text-gray-900 font-medium">{item.label}</span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-blue-500 hover:underline transition"
              >
                {item.label}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}
