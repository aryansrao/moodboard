'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { X, Download, Link2, Share2, Search, Send, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Avatar } from '@/components/ui/Avatar'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/auth'
import { useUIStore } from '@/lib/stores/ui'
import { queryKeys } from '@/lib/query-keys'
import type { Post, UserMini } from '@/lib/types'

const SOCIAL_PLATFORMS = ['instagram', 'tiktok', 'youtube', 'twitter', 'reddit', 'vimeo', 'pinterest', 'facebook']

interface ShareSheetProps {
  post: Post
  onClose: () => void
}

export function ShareSheet({ post, onClose }: ShareSheetProps) {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserMini[]>([])
  const [searching, setSearching] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [sent, setSent] = useState<Set<string>>(new Set())
  const [downloading, setDownloading] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Slide-in animation
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const handleClose = useCallback(() => {
    setVisible(false)
    setTimeout(onClose, 280)
  }, [onClose])

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) handleClose()
    }
    // Small delay so the initial render click doesn't immediately close
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 50)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler) }
  }, [handleClose])

  // Contacts cached for 60s — no reload every time share sheet opens
  const { data: contacts = [] } = useQuery({
    queryKey: queryKeys.contacts(),
    queryFn: () => api.messages.contacts(8),
    staleTime: 60_000,
    enabled: !!user,
  })

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    searchTimeout.current = setTimeout(async () => {
      try {
        const results = await api.search.users(q, 8)
        setSearchResults(results)
      } catch { /* ignore */ } finally { setSearching(false) }
    }, 300)
  }, [])

  const handleSendToUser = async (targetUser: UserMini) => {
    if (!user || sending) return
    setSending(targetUser.id)
    try {
      const conv = await api.messages.start(targetUser.id)
      await api.messages.sendPost(conv.id, post.id)
      setSent((prev) => new Set([...prev, targetUser.id]))
      addToast(`Sent to ${targetUser.display_name}`, 'success')
    } catch {
      addToast('Failed to send', 'error')
    } finally {
      setSending(null)
    }
  }

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/post/${post.id}`
    await navigator.clipboard.writeText(url)
    addToast('Link copied!', 'success')
    handleClose()
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const isSocial = SOCIAL_PLATFORMS.some((p) =>
        (post.source_platform === p) || post.source_url?.includes(p)
      )

      if (post.file_url) {
        // Uploaded file in R2 — extract extension from the URL so the filename is correct
        const cleanPath = post.file_url.split('?')[0]
        const urlExt = cleanPath.includes('.') ? `.${cleanPath.split('.').pop()}` : ''
        const baseName = post.title
          ?? cleanPath.split('/').pop()?.replace(/\.[^.]+$/, '')
          ?? 'moodboard-media'
        await triggerDownload(post.file_url, `${baseName}${urlExt}`)
        addToast('Download started', 'success')
      } else if (isSocial && post.source_url) {
        // Proxy through backend: handles CORS + ensures combined audio+video
        const { blob, filename } = await api.media.downloadMedia(post.source_url)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        addToast('Download started', 'success')
      } else if (post.thumbnail_url) {
        await triggerDownload(post.thumbnail_url, post.title ?? 'thumbnail')
        addToast('Download started', 'success')
      } else {
        addToast('No media available to download', 'error')
        return
      }
    } catch {
      addToast('Download failed', 'error')
    } finally {
      setDownloading(false)
      handleClose()
    }
  }

  const handleNativeShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title ?? 'Moodboard post', url })
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url)
      addToast('Link copied!', 'success')
    }
    handleClose()
  }

  const displayUsers = searchQuery.trim() ? searchResults : contacts

  const isSocial = SOCIAL_PLATFORMS.some((p) => post.source_platform === p || post.source_url?.includes(p))
  const hasDownload = !!(post.file_url || post.thumbnail_url || isSocial)

  return createPortal(
    // Portal to document.body ensures this is above all stacking contexts
    <div className="fixed inset-0 z-[9999] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Sheet — slides up from bottom */}
      <div
        ref={sheetRef}
        className={`relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl transition-transform duration-[280ms] ease-out ${visible ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ maxHeight: '82vh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#D1D5DB]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <h2 className="text-base font-semibold text-[#0A0A0A]">Share</h2>
          <button onClick={handleClose} className="text-[#6B7280] hover:text-[#0A0A0A] transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(82vh - 72px)' }}>
          {/* Send via DM */}
          {user && (
            <div className="px-5 pb-3">
              <p className="text-xs font-medium text-[#6B7280] mb-2.5">Send via message</p>

              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="text"
                  placeholder="Search people…"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 rounded-full border border-[#E5E4E2] text-sm focus:outline-none focus:border-[#536878] bg-[#FAFAFA]"
                />
              </div>

              {displayUsers.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {displayUsers.map((u) => {
                    const isSent = sent.has(u.id)
                    const isSending = sending === u.id
                    return (
                      <button
                        key={u.id}
                        onClick={() => !isSent && handleSendToUser(u)}
                        disabled={isSending}
                        className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-[#EEF1F3] transition-colors text-left disabled:opacity-60 w-full"
                      >
                        <Avatar src={u.avatar_url} name={u.display_name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#0A0A0A] truncate">{u.display_name}</p>
                          <p className="text-xs text-[#6B7280]">@{u.username}</p>
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSent ? 'bg-[#10B981] text-white' : 'bg-[#536878] text-white hover:bg-[#3d5060]'
                        }`}>
                          {isSending
                            ? <Loader2 size={14} className="animate-spin" />
                            : isSent
                              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                              : <Send size={14} />
                          }
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : searching ? (
                <p className="text-xs text-[#9CA3AF] py-2 text-center">Searching…</p>
              ) : searchQuery.trim() ? (
                <p className="text-xs text-[#9CA3AF] py-2 text-center">No users found</p>
              ) : contacts.length === 0 ? (
                <p className="text-xs text-[#9CA3AF] py-2 text-center">Start a conversation to see recent contacts</p>
              ) : null}
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-[#E5E4E2] mx-5 mb-3" />

          {/* Other actions */}
          <div className="px-5 pb-8 flex flex-col gap-1">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-[#EEF1F3] transition-colors text-left w-full"
            >
              <div className="w-10 h-10 rounded-full bg-[#EEF1F3] flex items-center justify-center flex-shrink-0">
                <Link2 size={18} className="text-[#536878]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#0A0A0A]">Copy link</p>
                <p className="text-xs text-[#6B7280]">Share the post URL</p>
              </div>
            </button>

            {hasDownload && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-[#EEF1F3] transition-colors text-left w-full disabled:opacity-60"
              >
                <div className="w-10 h-10 rounded-full bg-[#EEF1F3] flex items-center justify-center flex-shrink-0">
                  {downloading
                    ? <Loader2 size={18} className="text-[#536878] animate-spin" />
                    : <Download size={18} className="text-[#536878]" />
                  }
                </div>
                <div>
                  <p className="text-sm font-medium text-[#0A0A0A]">
                    {downloading ? 'Downloading…' : 'Download'}
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    {isSocial ? 'Download via yt-dlp' : 'Save media to device'}
                  </p>
                </div>
              </button>
            )}

            <button
              onClick={handleNativeShare}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-[#EEF1F3] transition-colors text-left w-full"
            >
              <div className="w-10 h-10 rounded-full bg-[#EEF1F3] flex items-center justify-center flex-shrink-0">
                <Share2 size={18} className="text-[#536878]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#0A0A0A]">Share</p>
                <p className="text-xs text-[#6B7280]">Share via other apps</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

async function triggerDownload(url: string, filename: string) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(a.href)
  } catch {
    // If fetch fails (e.g. CORS), open in new tab
    window.open(url, '_blank')
  }
}
