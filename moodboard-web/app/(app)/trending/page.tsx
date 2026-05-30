'use client'

import { useState, useCallback } from 'react'
import { MasonryGrid } from '@/components/feed/MasonryGrid'
import { Spinner } from '@/components/ui/Spinner'
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Post, Platform } from '@/lib/types'
import { useEffect } from 'react'

const PLATFORMS: { id: Platform | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'pinterest', label: 'Pinterest' },
  { id: 'twitter', label: 'Twitter' },
  { id: 'vimeo', label: 'Vimeo' },
]

export default function TrendingPage() {
  const [platform, setPlatform] = useState<Platform | 'all'>('all')
  const [posts, setPosts] = useState<Post[]>([])
  const [cursor, setCursor] = useState<string | undefined>()
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(
    async (reset = false) => {
      if (isLoading) return
      setIsLoading(true)
      try {
        const page = await api.feed.trending(reset ? undefined : cursor)
        const filtered =
          platform === 'all'
            ? page.posts
            : page.posts.filter((p) => p.source_platform === platform)

        if (reset) {
          setPosts(filtered)
        } else {
          setPosts((prev) => [...prev, ...filtered])
        }
        setCursor(page.next_cursor)
        setHasMore(!!page.next_cursor)
      } finally {
        setIsLoading(false)
      }
    },
    [isLoading, cursor, platform]
  )

  useEffect(() => {
    setPosts([])
    setCursor(undefined)
    setHasMore(true)
    load(true)
  }, [platform]) // eslint-disable-line react-hooks/exhaustive-deps

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: () => load(),
    hasMore,
    isLoading,
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[#0A0A0A] mb-6">Trending</h1>

      {/* Platform filter */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPlatform(p.id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              platform === p.id
                ? 'bg-[#536878] text-white'
                : 'bg-[#EEF1F3] text-[#536878] hover:bg-[#536878] hover:text-white'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <MasonryGrid posts={posts} />

      <div ref={sentinelRef} className="h-1" />

      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner className="text-[#536878]" />
        </div>
      )}
    </div>
  )
}
