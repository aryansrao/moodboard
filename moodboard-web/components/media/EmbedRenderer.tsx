'use client'

import { useMemo } from 'react'
import { ExternalLink } from 'lucide-react'
import type { Platform } from '@/lib/types'

interface EmbedRendererProps {
  platform: Platform
  sourceUrl: string
  embedUrl?: string
  thumbnailUrl?: string
  className?: string
}

function getEmbedUrl(platform: Platform, sourceUrl: string, embedUrl?: string): string | null {
  // Pinterest's stored embed_url is an HTML snippet from oEmbed, not a URL — always build from source
  if (embedUrl && platform !== 'pinterest') return embedUrl

  try {
    const url = new URL(sourceUrl)

    switch (platform) {
      case 'youtube': {
        const videoId = url.searchParams.get('v') ?? url.pathname.split('/').pop()
        if (!videoId) return null
        return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`
      }

      case 'vimeo': {
        const id = url.pathname.split('/').pop()
        if (!id) return null
        return `https://player.vimeo.com/video/${id}`
      }

      case 'tiktok': {
        const id = url.pathname.split('/').pop()
        if (!id) return null
        return `https://www.tiktok.com/embed/v2/${id}`
      }

      case 'spotify': {
        const parts = url.pathname.split('/').filter(Boolean)
        if (parts.length >= 2) {
          return `https://open.spotify.com/embed/${parts[0]}/${parts[1]}`
        }
        return null
      }

      case 'instagram': {
        const match = url.pathname.match(/\/(p|reel|tv)\/([^/]+)/)
        if (!match) return null
        return `https://www.instagram.com/${match[1]}/${match[2]}/embed/`
      }

      case 'pinterest': {
        // Standard /pin/ID/ format
        const pinId = url.pathname.match(/\/pin\/(\d+)/)?.[1]
        if (pinId) return `https://assets.pinterest.com/ext/embed.html?id=${pinId}`
        // pin.it short URLs: pathname is just the shortcode
        if (url.hostname.includes('pin.it')) {
          const code = url.pathname.replace(/^\//, '').split('/')[0]
          if (code) return `https://assets.pinterest.com/ext/embed.html?id=${code}`
        }
        return null
      }

      default:
        return null
    }
  } catch {
    return null
  }
}

const ASPECT_RATIOS: Partial<Record<Platform, string>> = {
  youtube: 'aspect-video',
  vimeo: 'aspect-video',
  tiktok: 'aspect-[9/16] max-w-sm mx-auto',
  spotify: 'h-20',
  instagram: 'aspect-[9/16] max-w-sm mx-auto',
  pinterest: 'aspect-[2/3] max-w-xs mx-auto',
}

export function EmbedRenderer({
  platform,
  sourceUrl,
  embedUrl,
  thumbnailUrl,
  className,
}: EmbedRendererProps) {
  const url = useMemo(
    () => getEmbedUrl(platform, sourceUrl, embedUrl),
    [platform, sourceUrl, embedUrl]
  )

  if (!url) {
    return (
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block w-full h-full min-h-[320px] group"
      >
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-[#1a1a1a]" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
          <div className="flex items-center gap-2 bg-white/90 rounded-full px-4 py-2 text-sm font-medium text-[#0A0A0A]">
            <ExternalLink size={14} /> Open on {platform}
          </div>
        </div>
      </a>
    )
  }

  return (
    <div className={ASPECT_RATIOS[platform] ?? 'aspect-video'}>
      <iframe
        src={url}
        title={`${platform} embed`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
        className={`w-full h-full rounded-xl border-0 ${className ?? ''}`}
      />
    </div>
  )
}
