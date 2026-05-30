'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import type { AIType, AIContext } from '@/lib/types'

interface AIButtonProps {
  type: AIType
  context: AIContext
  onStream?: (stream: ReadableStream) => void
  className?: string
  label?: string
}

export function AIButton({
  type,
  context,
  onStream,
  className,
  label = 'AI',
}: AIButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    if (isLoading) return
    setIsLoading(true)
    try {
      const stream = await api.ai.generate(type, context)
      onStream?.(stream)
    } catch {
      // silently fail — user can retry
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      aria-label={`Generate ${type} with AI`}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        'text-[#536878] border border-[#536878]/30 bg-[#EEF1F3]',
        'hover:bg-[#536878] hover:text-white hover:border-[#536878]',
        'transition-all duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        isLoading && 'animate-pulse',
        className
      )}
    >
      <Sparkles size={12} className={isLoading ? 'animate-spin' : ''} />
      {label}
    </button>
  )
}
