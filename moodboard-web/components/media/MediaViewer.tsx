'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ZoomIn, ZoomOut, ExternalLink } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { VideoPlayer } from './VideoPlayer'
import { EmbedRenderer } from './EmbedRenderer'
import { cn } from '@/lib/utils'
import type { Post } from '@/lib/types'

interface MediaViewerProps {
  post: Post
  open: boolean
  onClose: () => void
}

const EMBED_PLATFORMS = new Set(['youtube', 'vimeo', 'tiktok', 'spotify', 'instagram', 'twitter', 'reddit'])

export function MediaViewer({ post, open, onClose }: MediaViewerProps) {
  const [zoom, setZoom] = useState(1)

  const isEmbed = EMBED_PLATFORMS.has(post.source_platform)
  const isVideoUpload = post.media_type === 'video_upload'
  const isImageUpload =
    post.media_type === 'image_upload' || post.media_type === 'image'

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="full"
      className="max-h-[95vh]"
    >
      <div className="p-4">
        {/* Embed (YouTube, Vimeo, TikTok, Spotify) */}
        {isEmbed && (
          <EmbedRenderer
            platform={post.source_platform}
            sourceUrl={post.source_url}
            embedUrl={post.embed_url}
          />
        )}

        {/* Video upload */}
        {isVideoUpload && post.file_url && (
          <VideoPlayer
            src={post.file_url}
            poster={post.thumbnail_url}
            className="max-h-[70vh]"
          />
        )}

        {/* Image */}
        {isImageUpload && (post.file_url ?? post.thumbnail_url) && (
          <div className="relative">
            <div
              className="relative overflow-hidden rounded-xl bg-[#F3F4F6] flex items-center justify-center"
              style={{ minHeight: 300 }}
            >
              <div
                style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s ease' }}
              >
                <Image
                  src={(post.file_url ?? post.thumbnail_url)!}
                  alt={post.title ?? 'Post image'}
                  width={900}
                  height={600}
                  className="rounded-xl object-contain max-h-[70vh] w-auto"
                />
              </div>
            </div>

            {/* Zoom controls */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/90 rounded-lg shadow p-1">
              <button
                onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                className="p-1.5 rounded text-[#6B7280] hover:text-[#0A0A0A] hover:bg-[#EEF1F3] transition-colors"
                aria-label="Zoom out"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-xs text-[#6B7280] w-10 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                className="p-1.5 rounded text-[#6B7280] hover:text-[#0A0A0A] hover:bg-[#EEF1F3] transition-colors"
                aria-label="Zoom in"
              >
                <ZoomIn size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Article / web link */}
        {post.media_type === 'article' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            {post.thumbnail_url && (
              <Image
                src={post.thumbnail_url}
                alt={post.title ?? ''}
                width={600}
                height={300}
                className="rounded-xl object-cover w-full max-h-60"
              />
            )}
            <a
              href={post.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#536878] text-white text-sm font-medium hover:bg-[#445868] transition-colors"
            >
              <ExternalLink size={16} />
              Open article
            </a>
          </div>
        )}
      </div>
    </Modal>
  )
}
