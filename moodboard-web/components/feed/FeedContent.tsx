'use client'

import { useState, useCallback, useEffect } from 'react'
import { MasonryGrid } from './MasonryGrid'
import { Spinner } from '@/components/ui/Spinner'
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll'
import { useFeedStore } from '@/lib/stores/feed'
import { api } from '@/lib/api'
import type { Collection } from '@/lib/types'

export function FeedContent() {
  const {
    posts,
    tab,
    cursor,
    hasMore,
    isLoading,
    setPosts,
    appendPosts,
    setCursor,
    setHasMore,
    setLoading,
  } = useFeedStore()

  const [initialized, setInitialized] = useState(false)
  const [collections, setCollections] = useState<Collection[]>([])

  useEffect(() => {
    api.collections.discover().then(setCollections).catch(() => {})
  }, [])

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return
    setLoading(true)
    try {
      let page
      if (tab === 'following') {
        page = await api.feed.following(cursor)
      } else if (tab === 'trending') {
        page = await api.feed.trending(cursor)
      } else {
        page = await api.feed.get(cursor)
      }

      if (!initialized) {
        setPosts(page.posts)
        setInitialized(true)
      } else {
        appendPosts(page.posts)
      }
      setCursor(page.next_cursor)
      setHasMore(!!page.next_cursor)
    } catch {
      // fail silently — user can scroll to retry
    } finally {
      setLoading(false)
    }
  }, [isLoading, hasMore, tab, cursor, initialized, setPosts, appendPosts, setCursor, setHasMore, setLoading])

  // Load on mount and tab change
  useEffect(() => {
    if (!initialized) {
      loadMore()
    }
  }, [initialized]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reload when tab changes (store resets posts/cursor)
  useEffect(() => {
    setInitialized(false)
  }, [tab])

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading,
  })

  return (
    <div className="relative">
      <MasonryGrid posts={posts} collections={collections} />

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1" />

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner className="text-[#536878]" />
        </div>
      )}

      {/* End of feed */}
      {!hasMore && posts.length > 0 && (
        <p className="text-center text-sm text-[#6B7280] py-8">
          You&apos;ve seen everything! Check back later.
        </p>
      )}

    </div>
  )
}
