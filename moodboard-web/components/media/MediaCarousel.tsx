'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { VideoPlayer } from './VideoPlayer'
import type { MediaItem } from '@/lib/types'

interface MediaCarouselProps {
  items: MediaItem[]
  title?: string
}

export function MediaCarousel({ items, title }: MediaCarouselProps) {
  const [idx, setIdx] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const prev = () => setIdx((i) => Math.max(0, i - 1))
  const next = () => setIdx((i) => Math.min(items.length - 1, i + 1))

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (dx > 50) prev()
    else if (dx < -50) next()
    touchStartX.current = null
  }

  const item = items[idx]
  const isVideo = item.media_type === 'video_upload'
  const isPdf = item.media_type === 'pdf' || item.file_url?.toLowerCase().endsWith('.pdf')
  const displaySrc = item.thumbnail_url ?? (isPdf ? null : item.file_url)

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Slide */}
      <div
        className="relative flex-1 flex items-center justify-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {isVideo && item.file_url ? (
          <VideoPlayer src={item.file_url} poster={item.thumbnail_url} />
        ) : isPdf && item.file_url ? (
          <iframe
            src={item.file_url}
            title="PDF"
            className="w-full h-full min-h-[400px]"
          />
        ) : displaySrc ? (
          <Image
            src={displaySrc}
            alt={title ?? 'Media'}
            width={900}
            height={1200}
            className="w-full h-auto max-h-[80vh] object-contain"
          />
        ) : null}

        {/* Arrows */}
        {idx > 0 && (
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        {idx < items.length - 1 && (
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            aria-label="Next"
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 py-3">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`rounded-full transition-all duration-200 ${
              i === idx
                ? 'w-4 h-1.5 bg-white'
                : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/60'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
