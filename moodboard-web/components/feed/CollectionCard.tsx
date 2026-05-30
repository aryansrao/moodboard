'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { LayoutGrid, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/auth'
import { useUIStore } from '@/lib/stores/ui'
import type { Collection } from '@/lib/types'

interface CollectionCardProps {
  collection: Collection
  className?: string
}

export function CollectionCard({ collection, className }: CollectionCardProps) {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const [likeCount, setLikeCount] = useState(collection.follower_count)
  const [isLiked, setIsLiked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const thumbnails = collection.posts?.slice(0, 4) ?? []

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { addToast('Sign in to like collections', 'error'); return }
    if (isLoading) return
    setIsLoading(true)
    const prev = isLiked
    setIsLiked(!prev)
    setLikeCount((c) => (prev ? c - 1 : c + 1))
    try {
      await api.collections.follow(collection.slug)
    } catch {
      setIsLiked(prev)
      setLikeCount((c) => (prev ? c + 1 : c - 1))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Link href={`/c/${collection.slug}`} className="block col-span-2">
      <article
        className={cn(
          'bg-white rounded-xl overflow-hidden',
          'shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]',
          'hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-shadow duration-150',
          className
        )}
      >
        {/* 2x2 thumbnail grid */}
        <div className="grid grid-cols-2 gap-0.5 aspect-[2/1]">
          {thumbnails.length > 0 ? (
            thumbnails.map((post, i) => (
              <div key={post.id} className="relative overflow-hidden bg-[#EEF1F3]">
                {post.thumbnail_url && (
                  <Image
                    src={post.thumbnail_url}
                    alt={post.title ?? `Post ${i + 1}`}
                    fill
                    sizes="(max-width: 640px) 25vw, 15vw"
                    className="object-cover"
                  />
                )}
              </div>
            ))
          ) : (
            // Placeholder when no posts
            <div className="col-span-2 flex items-center justify-center bg-[#EEF1F3]">
              <LayoutGrid size={32} className="text-[#6B7280]" />
            </div>
          )}
          {/* Fill remaining slots */}
          {thumbnails.length > 0 &&
            thumbnails.length < 4 &&
            Array.from({ length: 4 - thumbnails.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="bg-[#EEF1F3]"
              />
            ))}
        </div>

        {/* Collection info */}
        <div className="px-4 py-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-[#0A0A0A] truncate">
              {collection.title}
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              {collection.post_count} posts
            </p>
          </div>
          <button
            onClick={handleLike}
            disabled={isLoading}
            className={cn(
              'flex items-center gap-1 text-xs transition-colors disabled:opacity-50 flex-shrink-0',
              isLiked ? 'text-[#EF4444]' : 'text-[#6B7280] hover:text-[#EF4444]'
            )}
            aria-label={isLiked ? 'Unlike collection' : 'Like collection'}
          >
            <Heart size={13} fill={isLiked ? 'currentColor' : 'none'} />
            {likeCount > 0 && likeCount}
          </button>
        </div>
      </article>
    </Link>
  )
}
