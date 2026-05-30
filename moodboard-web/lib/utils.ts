import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Platform } from './types'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(date))

export const formatRelative = (date: string): string => {
  const now = Date.now()
  const then = new Date(date).getTime()
  const diff = now - then

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  if (weeks < 4) return `${weeks}w ago`
  if (months < 12) return `${months}mo ago`
  return `${years}y ago`
}

export const truncate = (str: string, n: number): string =>
  str.length > n ? str.slice(0, n) + '…' : str

export const platformIcon = (platform: Platform): string => {
  const icons: Record<Platform, string> = {
    youtube: '▶',
    instagram: '◈',
    tiktok: '♪',
    pinterest: 'P',
    twitter: '𝕏',
    reddit: '⬤',
    vimeo: '❐',
    spotify: '♫',
    soundcloud: '☁',
    behance: 'Be',
    dribbble: '⊙',
    cosmos: '✦',
    web: '🔗',
    upload: '↑',
  }
  return icons[platform] ?? '🔗'
}

export const platformName = (platform: Platform): string => {
  const names: Record<Platform, string> = {
    youtube: 'YouTube',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    pinterest: 'Pinterest',
    twitter: 'Twitter/X',
    reddit: 'Reddit',
    vimeo: 'Vimeo',
    spotify: 'Spotify',
    soundcloud: 'SoundCloud',
    behance: 'Behance',
    dribbble: 'Dribbble',
    cosmos: 'Cosmos',
    web: 'Web',
    upload: 'Upload',
  }
  return names[platform] ?? 'Web'
}

export const isVideoType = (mediaType: string): boolean =>
  ['video', 'video_upload'].includes(mediaType)

export const isImageType = (mediaType: string): boolean =>
  ['image', 'image_upload'].includes(mediaType)

export const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export const formatCount = (count: number): string => {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return String(count)
}

export const postSlug = (post: { id: string; title?: string | null }): string => {
  if (!post.title) return post.id
  const slug = post.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  return slug ? `${slug}-${post.id}` : post.id
}
