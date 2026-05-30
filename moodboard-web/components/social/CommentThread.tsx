'use client'

import { useState, useRef, useCallback } from 'react'
import { Send, Trash2, X, CornerDownRight } from 'lucide-react'
import { cn, formatRelative } from '@/lib/utils'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/auth'
import type { Comment } from '@/lib/types'

interface CommentThreadProps {
  postId: string
  comments: Comment[]
  onCommentAdded?: (comment: Comment) => void
}

interface ReplyTarget {
  id: string
  body: string
  displayName: string
}

interface BubbleProps {
  comment: Comment
  replies?: Comment[]
  parentMap: Map<string, Comment>
  onStartReply: (target: ReplyTarget) => void
  currentUserId?: string
}

function Bubble({ comment, replies = [], parentMap, onStartReply, currentUserId }: BubbleProps) {
  const isOwn = currentUserId === comment.user?.id
  const parent = comment.parent_id ? parentMap.get(comment.parent_id) : undefined

  const scrollToParent = () => {
    if (!comment.parent_id) return
    document.getElementById(`comment-${comment.parent_id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div id={`comment-${comment.id}`} className={cn('flex flex-col gap-0.5', isOwn ? 'items-end' : 'items-start')}>
      {!isOwn && !comment.parent_id && (
        <p className="text-[10px] font-medium text-[#9CA3AF] px-1">
          {comment.user?.display_name ?? 'Anonymous'}
        </p>
      )}

      <div
        className={cn(
          'max-w-[80%] break-words leading-relaxed text-sm px-4 py-2.5 rounded-2xl',
          isOwn
            ? 'bg-[#536878] text-white rounded-br-[5px]'
            : 'bg-[#F0F2F4] text-[#0A0A0A] rounded-bl-[5px]'
        )}
      >
        {/* Quoted parent — click scrolls to original */}
        {parent && (
          <button
            onClick={scrollToParent}
            className={cn(
              'block w-full text-left mb-2 px-2 py-1.5 rounded-lg text-xs line-clamp-2 border-l-2 transition-opacity hover:opacity-75',
              isOwn
                ? 'bg-white/15 text-white/80 border-white/40'
                : 'bg-black/5 text-[#536878] border-[#536878]/50'
            )}
          >
            {parent.body}
          </button>
        )}
        {comment.body}
      </div>

      <div className={cn('flex items-center gap-2 px-1', isOwn && 'flex-row-reverse')}>
        <span className="text-[10px] text-[#C4C9D4]">{formatRelative(comment.created_at)}</span>
        {!comment.parent_id && (
          <button
            onClick={() => onStartReply({
              id: comment.id,
              body: comment.body,
              displayName: comment.user?.display_name ?? 'Anonymous',
            })}
            className="text-[10px] text-[#9CA3AF] hover:text-[#536878] transition-colors"
          >
            reply
          </button>
        )}
        {isOwn && (
          <button className="text-[10px] text-[#9CA3AF] hover:text-[#EF4444] transition-colors">
            <Trash2 size={10} />
          </button>
        )}
      </div>

      {/* Nested replies — same bubble style, slightly indented */}
      {replies.length > 0 && (
        <div className={cn('mt-2 flex flex-col gap-2 w-full', isOwn ? 'pr-2' : 'pl-4')}>
          {replies.map((reply) => (
            <Bubble
              key={reply.id}
              comment={reply}
              parentMap={parentMap}
              onStartReply={onStartReply}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function CommentThread({ postId, comments, onCommentAdded }: CommentThreadProps) {
  const [localComments, setLocalComments] = useState<Comment[]>(comments)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<ReplyTarget | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuthStore()

  const handleStartReply = useCallback((target: ReplyTarget) => {
    setReplyingTo(target)
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!newComment.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      const comment = await api.posts.addComment(postId, newComment.trim(), replyingTo?.id)
      setLocalComments((prev) => [...prev, comment])
      onCommentAdded?.(comment)
      setNewComment('')
      setReplyingTo(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const parentMap = new Map(localComments.map((c) => [c.id, c]))
  const topLevel = localComments.filter((c) => !c.parent_id)
  const replyMap = new Map<string, Comment[]>()
  localComments.forEach((c) => {
    if (c.parent_id) {
      const arr = replyMap.get(c.parent_id) ?? []
      arr.push(c)
      replyMap.set(c.parent_id, arr)
    }
  })

  return (
    <section aria-label="Comments" className="flex flex-col gap-4">
      <p className="text-[10px] font-semibold text-[#C4C9D4] uppercase tracking-widest">
        {topLevel.length} {topLevel.length === 1 ? 'comment' : 'comments'}
      </p>

      <div className="flex flex-col gap-4">
        {topLevel.map((comment) => (
          <Bubble
            key={comment.id}
            comment={comment}
            replies={replyMap.get(comment.id) ?? []}
            parentMap={parentMap}
            onStartReply={handleStartReply}
            currentUserId={user?.id}
          />
        ))}
        {topLevel.length === 0 && (
          <p className="text-xs text-[#C4C9D4] text-center py-6">
            No messages yet. Start the conversation!
          </p>
        )}
      </div>

      {user ? (
        <div className="pt-2 border-t border-[#F0F2F4]">
          {replyingTo && (
            <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-[#F0F2F4] rounded-xl">
              <CornerDownRight size={11} className="text-[#536878] shrink-0" />
              <p className="flex-1 text-xs text-[#536878] line-clamp-1">{replyingTo.body}</p>
              <button
                onClick={() => setReplyingTo(null)}
                className="shrink-0 text-[#9CA3AF] hover:text-[#0A0A0A] transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyingTo ? `Reply to ${replyingTo.displayName}…` : 'Add a comment…'}
              className="flex-1 text-sm bg-[#F0F2F4] rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#536878]/20"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setReplyingTo(null)
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
              }}
            />
            <button
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              className="shrink-0 w-9 h-9 rounded-full bg-[#536878] text-white flex items-center justify-center disabled:opacity-40 transition-opacity"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      ) : (
        <p className="text-xs text-[#9CA3AF] text-center pt-2">
          <a href="/login" className="text-[#536878] underline">Sign in</a> to comment
        </p>
      )}
    </section>
  )
}
