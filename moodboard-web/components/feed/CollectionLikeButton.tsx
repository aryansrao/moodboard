'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/auth'
import { useUIStore } from '@/lib/stores/ui'
import { cn } from '@/lib/utils'

interface CollectionLikeButtonProps {
  slug: string
  initialCount: number
}

export function CollectionLikeButton({ slug, initialCount }: CollectionLikeButtonProps) {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const [isLiked, setIsLiked] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [isLoading, setIsLoading] = useState(false)

  const handleLike = async () => {
    if (!user) { addToast('Sign in to like collections', 'error'); return }
    if (isLoading) return
    setIsLoading(true)
    const prev = isLiked
    setIsLiked(!prev)
    setCount((c) => (prev ? c - 1 : c + 1))
    try {
      await api.collections.follow(slug)
    } catch {
      setIsLiked(prev)
      setCount((c) => (prev ? c + 1 : c - 1))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleLike}
      disabled={isLoading}
      className={cn(
        'inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full border transition-colors disabled:opacity-50',
        isLiked
          ? 'bg-red-50 border-red-200 text-[#EF4444]'
          : 'border-[#E5E4E2] text-[#6B7280] hover:border-red-200 hover:text-[#EF4444] hover:bg-red-50'
      )}
      aria-label={isLiked ? 'Unlike collection' : 'Like collection'}
    >
      <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
      {count > 0 ? count : null}
      {isLiked ? 'Liked' : 'Like'}
    </button>
  )
}
