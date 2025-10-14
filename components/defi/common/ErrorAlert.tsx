'use client'

import { AlertCircle, X } from 'lucide-react'

interface ErrorAlertProps {
  message: string
  onClose: () => void
}

export default function ErrorAlert({ message, onClose }: ErrorAlertProps) {
  return (
    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 animate-fade-in">
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-red-800 font-medium">错误</p>
        <p className="text-red-700 text-sm mt-1">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="text-red-500 hover:text-red-700 transition"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  )
}
