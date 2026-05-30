'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { X, Heart, Bookmark, ChevronUp, ChevronDown, Play, Pause } from 'lucide-react'
import { cn, formatRelative } from '@/lib/utils'
import { api } from '@/lib/api'
import { useFeedStore } from '@/lib/stores/feed'
import type { Post } from '@/lib/types'

interface ReelModeProps {
  posts: Post[]
  initialIndex?: number
  onClose: () => void
}

export function ReelMode({ posts, initialIndex = 0, onClose }: ReelModeProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef<number | null>(null)
  const { setReelIndex } = useFeedStore()

  const current = posts[currentIndex]

  const isImagePost = current
    ? ['image', 'image_upload'].includes(current.media_type)
    : true
  const duration = isImagePost ? 4000 : 0 // Videos play their own duration

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, posts.length - 1))
    setProgress(0)
  }, [posts.length])

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0))
    setProgress(0)
  }, [])

  // Auto-advance for images
  useEffect(() => {
    if (!isImagePost || isPaused || duration === 0) return
    if (timerRef.current) clearInterval(timerRef.current)

    const startTime = Date.now()
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const pct = Math.min((elapsed / duration) * 100, 100)
      setProgress(pct)
      if (pct >= 100) {
        goNext()
      }
    }, 50)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [currentIndex, isPaused, isImagePost, duration, goNext])

  // Sync with feed store
  useEffect(() => {
    setReelIndex(currentIndex)
  }, [currentIndex, setReelIndex])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') goPrev()
      if (e.key === ' ') {
        e.preventDefault()
        setIsPaused((p) => !p)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, goNext, goPrev])

  // Touch/swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return
    const delta = touchStartY.current - e.changedTouches[0].clientY
    if (Math.abs(delta) > 50) {
      if (delta > 0) goNext()
      else goPrev()
    }
    touchStartY.current = null
  }

  const handleLike = async () => {
    if (!current) return
    const prev = likedPosts.has(current.id)
    setLikedPosts((s) => {
      const next = new Set(s)
      if (prev) next.delete(current.id)
      else next.add(current.id)
      return next
    })
    try {
      await api.posts.like(current.id)
    } catch {
      setLikedPosts((s) => {
        const next = new Set(s)
        if (prev) next.add(current.id)
        else next.delete(current.id)
        return next
      })
    }
  }

  const handleSave = async () => {
    if (!current) return
    const prev = savedPosts.has(current.id)
    setSavedPosts((s) => {
      const next = new Set(s)
      if (prev) next.delete(current.id)
      else next.add(current.id)
      return next
    })
    try {
      await api.posts.save(current.id)
    } catch {
      setSavedPosts((s) => {
        const next = new Set(s)
        if (prev) next.add(current.id)
        else next.delete(current.id)
        return next
      })
    }
  }

  if (!current) return null

  const isLiked = likedPosts.has(current.id)
  const isSaved = savedPosts.has(current.id)

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[60] bg-black flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-modal="true"
      role="dialog"
      aria-label="Reel mode"
    >
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 z-20 h-0.5 bg-white/20">
        <div
          className="h-full bg-white transition-none"
          style={{ width: `${isImagePost ? progress : 100}%` }}
        />
      </div>

      {/* Top controls */}
      <div className="absolute top-4 left-0 right-0 z-20 flex items-center justify-between px-4">
        <span className="text-white/60 text-sm">
          {currentIndex + 1} / {posts.length}
        </span>
        <div className="flex items-center gap-2">
          {isImagePost && (
            <button
              onClick={() => setIsPaused((p) => !p)}
              className="p-2 rounded-full bg-black/40 text-white"
              aria-label={isPaused ? 'Play' : 'Pause'}
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/40 text-white"
            aria-label="Close reel"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 relative flex items-center justify-center">
        {/* Preload adjacent posts with Activity-like approach */}
        {posts.slice(currentIndex + 1, currentIndex + 4).map((p, i) => (
          <div key={p.id} className="hidden">
            {p.thumbnail_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.thumbnail_url} alt="" aria-hidden />
            )}
          </div>
        ))}

        {current.thumbnail_url || current.file_url ? (
          <Image
            src={(current.thumbnail_url ?? current.file_url)!}
            alt={current.title ?? 'Post'}
            fill
            sizes="100vw"
            className="object-contain"
            priority
          />
        ) : (
          <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center">
            <span className="text-white/40 text-lg">No media</span>
          </div>
        )}
      </div>

      {/* Navigation arrows */}
      <button
        onClick={goPrev}
        disabled={currentIndex === 0}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/40 text-white disabled:opacity-20"
        aria-label="Previous post"
      >
        <ChevronUp size={20} />
      </button>
      <button
        onClick={goNext}
        disabled={currentIndex === posts.length - 1}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/40 text-white disabled:opacity-20"
        aria-label="Next post"
      >
        <ChevronDown size={20} />
      </button>

      {/* Bottom overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-6">
        <div className="flex items-end justify-between gap-4">
          <div className="flex-1 min-w-0">
            {current.user && (
              <p className="text-white/70 text-xs mb-1">
                @{current.user.username} · {formatRelative(current.created_at)}
              </p>
            )}
            {current.title && (
              <p className="text-white font-semibold text-base line-clamp-2">
                {current.title}
              </p>
            )}
            {current.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-white/60 text-xs mr-2">
                #{tag}
              </span>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleLike}
              className={cn(
                'flex flex-col items-center gap-1 transition-colors',
                isLiked ? 'text-red-400' : 'text-white'
              )}
              aria-label={isLiked ? 'Unlike' : 'Like'}
            >
              <Heart
                size={28}
                fill={isLiked ? 'currentColor' : 'none'}
              />
              <span className="text-xs">{current.like_count + (isLiked && !current.is_liked ? 1 : 0)}</span>
            </button>
            <button
              onClick={handleSave}
              className={cn(
                'flex flex-col items-center gap-1 transition-colors',
                isSaved ? 'text-[#536878]' : 'text-white'
              )}
              aria-label={isSaved ? 'Unsave' : 'Save'}
            >
              <Bookmark
                size={28}
                fill={isSaved ? 'currentColor' : 'none'}
              />
              <span className="text-xs">{current.save_count}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
