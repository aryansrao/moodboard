'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Blurhash } from 'react-blurhash'
import { useInView } from 'react-intersection-observer'
import { Heart, Bookmark, Play, Images } from 'lucide-react'
import { PdfThumbnail } from '@/components/media/PdfThumbnail'
import { cn, truncate, platformName, postSlug } from '@/lib/utils'
import { api } from '@/lib/api'
import { useUIStore } from '@/lib/stores/ui'
import { usePostInteractionsStore } from '@/lib/stores/postInteractions'
import type { Post } from '@/lib/types'

interface PostCardProps {
  post: Post
  priority?: boolean
  onSave?: (post: Post) => void
  onShare?: (post: Post) => void
}

function getSourceLabel(post: Post): string {
  if (post.source_platform === 'upload') {
    return post.user?.username ? `@${post.user.username}` : '@me'
  }
  if (!post.source_platform || post.source_platform === 'web') {
    try {
      return new URL(post.source_url).hostname.replace(/^www\./, '')
    } catch {
      return 'web'
    }
  }
  return platformName(post.source_platform)
}

export function PostCard({ post, priority = false }: PostCardProps) {
  const { openSavePostModal } = useUIStore()
  const { setLiked: setGlobalLiked } = usePostInteractionsStore()
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isLiked, setIsLiked] = useState(post.is_liked ?? false)
  const [likeCount, setLikeCount] = useState(post.like_count)
  const [isLiking, setIsLiking] = useState(false)
  const [displayRatio, setDisplayRatio] = useState(post.aspect_ratio || 1)

  const { ref: inViewRef, inView } = useInView({ rootMargin: '150px', triggerOnce: true })

  const isVideo = ['youtube', 'vimeo', 'tiktok', 'instagram', 'pinterest'].includes(post.source_platform)
    || post.media_type === 'video'
    || post.media_type === 'video_upload'

  const isPdf = post.media_type === 'pdf' || !!post.file_url?.toLowerCase().endsWith('.pdf')
  const pdfThumb = isPdf && post.thumbnail_url && !post.thumbnail_url.toLowerCase().endsWith('.pdf')
    ? post.thumbnail_url : null
  const displayImage = isPdf ? pdfThumb : (post.thumbnail_url ?? post.file_url)
  const pdfRatio = post.aspect_ratio || 0.707

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (isLiking) return
    setIsLiking(true)
    const prev = isLiked
    setIsLiked(!prev)
    setLikeCount((c) => prev ? c - 1 : c + 1)
    setGlobalLiked(post.id, !prev)
    try {
      const { liked, like_count } = await api.posts.like(post.id)
      setIsLiked(liked); setLikeCount(like_count); setGlobalLiked(post.id, liked, like_count)
    } catch {
      setIsLiked(prev); setLikeCount((c) => prev ? c + 1 : c - 1); setGlobalLiked(post.id, prev)
    } finally { setIsLiking(false) }
  }, [isLiking, isLiked, post.id, setGlobalLiked])

  const handleSave = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    openSavePostModal(post.id)
  }, [post.id, openSavePostModal])

  return (
    <div ref={inViewRef} style={{ viewTransitionName: `post-${post.id}` }}>
      <Link
        href={`/post/${postSlug(post)}`}
        className="block"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <article className={cn(
          'relative rounded-xl overflow-hidden cursor-pointer',
          'shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]',
          'transition-shadow duration-150 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]'
        )}>
          {/* Full-image container */}
          <div
            className="relative w-full overflow-hidden bg-[#EEF1F3]"
            style={{ aspectRatio: String(isPdf && !displayImage ? pdfRatio : displayRatio) }}
          >
            {post.blurhash && (
              <div className="absolute inset-0">
                <Blurhash hash={post.blurhash} width="100%" height="100%" resolutionX={32} resolutionY={32} punch={1} />
              </div>
            )}

            {(inView || priority) && displayImage && (
              <Image
                src={displayImage}
                alt={post.title ?? 'Post image'}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                priority={priority}
                loading={priority ? 'eager' : 'lazy'}
                className={cn('object-cover absolute inset-0 transition-opacity duration-300', imageLoaded ? 'opacity-100' : 'opacity-0')}
                onLoad={(e) => {
                  const img = e.target as HTMLImageElement
                  if (img.naturalWidth && img.naturalHeight) setDisplayRatio(img.naturalWidth / img.naturalHeight)
                  setImageLoaded(true)
                }}
              />
            )}

            {isPdf && !displayImage && inView && post.file_url && (
              <div className="absolute inset-0">
                <PdfThumbnail url={post.file_url} className="absolute inset-0 w-full h-full" />
              </div>
            )}

            {/* Top-right badge: video play OR carousel icon */}
            {(isVideo || (post.media_items?.length ?? 0) > 1) && (
              <div className="absolute top-2 right-2 z-10 pointer-events-none">
                <div className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                  {isVideo
                    ? <Play size={12} className="text-white fill-white translate-x-px" />
                    : <Images size={12} className="text-white" />
                  }
                </div>
              </div>
            )}

            {/* Hover overlay — gradient + title + actions */}
            <div className={cn(
              'absolute inset-0 flex flex-col justify-between transition-opacity duration-200',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}>
              {/* Top: source badge */}
              <div className="p-2">
                <span className="text-[10px] font-semibold bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full">
                  {getSourceLabel(post)}
                </span>
              </div>

              {/* Bottom: progressive blur gradient + title + buttons */}
              <div className="relative">
                {/* Gradient */}
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/75 via-black/30 to-transparent pointer-events-none" />

                <div className="relative px-2.5 pb-2 flex items-end justify-between gap-2">
                  {/* Title */}
                  <p className="text-xs font-semibold text-white leading-snug line-clamp-2 drop-shadow flex-1">
                    {truncate(post.title ?? '', 60)}
                  </p>

                  {/* Action buttons */}
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={handleLike}
                      aria-label={isLiked ? 'Unlike' : 'Like'}
                      className={cn(
                        'p-1.5 rounded-full backdrop-blur-sm transition-all duration-150',
                        isLiked ? 'bg-red-500 text-white' : 'bg-black/50 text-white hover:bg-black/70'
                      )}
                    >
                      <Heart size={13} fill={isLiked ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={handleSave}
                      aria-label="Save"
                      className="p-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-all duration-150"
                    >
                      <Bookmark size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      </Link>
    </div>
  )
}
