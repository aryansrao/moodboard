'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Heart, Bookmark, Share2, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/auth'
import { useUIStore } from '@/lib/stores/ui'
import { usePostInteractionsStore } from '@/lib/stores/postInteractions'
import { useRouter } from 'next/navigation'
import type { Post } from '@/lib/types'
import { ShareSheet } from '@/components/messages/ShareSheet'

interface PostActionsProps {
  post: Post & { is_liked: boolean; is_saved: boolean }
}

export function PostActions({ post }: PostActionsProps) {
  const { user } = useAuthStore()
  const { addToast, openSavePostModal } = useUIStore()
  const { interactions, setLiked: setGlobalLiked } = usePostInteractionsStore()
  const router = useRouter()

  // Seed initial state from global interaction store (set by PostCard) or server value
  const cached = interactions[post.id]
  const [isLiked, setIsLiked] = useState(cached?.isLiked ?? post.is_liked)
  // Use server-confirmed count from store if available, else fall back to server-rendered value
  const [likeCount, setLikeCount] = useState(cached?.likeCount ?? post.like_count)
  const [isSaved, setIsSaved] = useState(cached?.isSaved ?? post.is_saved)
  const [saveCount, setSaveCount] = useState(post.save_count)
  const [isLiking, setIsLiking] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  // Track whether user has already interacted, so we don't overwrite optimistic state
  const hasInteracted = useRef(cached !== undefined)

  // Sync like/save state from authenticated API call after mount (fills gaps when not in global store)
  useEffect(() => {
    if (!user || hasInteracted.current) return
    api.posts.get(post.id).then((p) => {
      if (!hasInteracted.current) {
        setIsLiked(p.is_liked)
        setIsSaved(p.is_saved)
        setLikeCount(p.like_count)
        setSaveCount(p.save_count)
        setGlobalLiked(post.id, p.is_liked, p.like_count)
      }
    }).catch(() => {})
  }, [post.id, user, setGlobalLiked])

  const isOwn = user?.id === post.user_id

  const handleLike = useCallback(async () => {
    if (!user) { addToast('Sign in to like posts', 'error'); return }
    if (isLiking) return
    hasInteracted.current = true
    setIsLiking(true)
    const prev = isLiked
    const next = !prev
    setIsLiked(next)
    setLikeCount((c) => prev ? c - 1 : c + 1)
    setGlobalLiked(post.id, next)
    try {
      const { liked, like_count } = await api.posts.like(post.id)
      setIsLiked(liked)
      setLikeCount(like_count)
      setGlobalLiked(post.id, liked, like_count)
    } catch {
      setIsLiked(prev)
      setLikeCount((c) => prev ? c + 1 : c - 1)
      setGlobalLiked(post.id, prev)
    } finally {
      setIsLiking(false)
    }
  }, [user, isLiking, isLiked, post.id, addToast, setGlobalLiked])

  const handleSave = useCallback(() => {
    if (!user) { addToast('Sign in to save posts', 'error'); return }
    hasInteracted.current = true
    openSavePostModal(post.id, (saved) => {
      setIsSaved(saved)
      setSaveCount((c) => saved ? c + 1 : c - 1)
    })
  }, [user, post.id, addToast, openSavePostModal])

  const handleShare = useCallback(() => {
    setShareOpen(true)
  }, [])

  const handleDelete = useCallback(async () => {
    if (!confirm('Delete this post? This cannot be undone.')) return
    setIsDeleting(true)
    try {
      await api.posts.delete(post.id)
      router.push('/home')
    } catch {
      setIsDeleting(false)
    }
  }, [post.id, router])

  return (
    <>
      <div className="flex items-center gap-4 py-3 border-y border-[#E5E4E2]">
        <button
          onClick={handleLike}
          className={`inline-flex items-center gap-1.5 text-sm transition-colors ${
            isLiked ? 'text-[#EF4444]' : 'text-[#6B7280] hover:text-[#EF4444]'
          }`}
        >
          <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
          {likeCount}
        </button>
        <button
          onClick={handleSave}
          className={`inline-flex items-center gap-1.5 text-sm transition-colors ${
            isSaved ? 'text-[#536878]' : 'text-[#6B7280] hover:text-[#536878]'
          }`}
        >
          <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
          {saveCount}
        </button>
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#536878] transition-colors ml-auto"
        >
          <Share2 size={16} />
          Share
        </button>
        {isOwn && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#EF4444] transition-colors disabled:opacity-50"
          >
            <Trash2 size={16} />
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        )}
      </div>
      {shareOpen && <ShareSheet post={post} onClose={() => setShareOpen(false)} />}
    </>
  )
}
