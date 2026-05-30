'use client'

import { useState, useEffect, useRef, useMemo, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft, Send, Reply, Pencil, Trash2, Check, X,
  CornerUpLeft, ExternalLink,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Avatar } from '@/components/ui/Avatar'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/auth'
import { useUIStore } from '@/lib/stores/ui'
import { queryKeys } from '@/lib/query-keys'
import type { Conversation, Message } from '@/lib/types'
import { cn } from '@/lib/utils'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Props { params: Promise<{ id: string }> }

export default function ChatPage({ params }: Props) {
  const { id: convId } = use(params)
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const router = useRouter()
  const queryClient = useQueryClient()

  // Conversation header — shared cache with layout/page, no extra network call
  const { data: allConvos = [] } = useQuery({
    queryKey: queryKeys.conversations(),
    queryFn: () => api.messages.list(),
    staleTime: 10_000,
    enabled: !!user,
  })
  const { data: allRequests = [] } = useQuery({
    queryKey: queryKeys.conversationRequests(),
    queryFn: () => api.messages.requests(),
    staleTime: 10_000,
    enabled: !!user,
  })
  const conv = useMemo(
    () => [...allConvos, ...allRequests].find((c) => c.id === convId) ?? null,
    [allConvos, allRequests, convId]
  )

  // Latest messages (newest first from API, reversed for display)
  const { data: messagesData } = useQuery({
    queryKey: queryKeys.messages(convId),
    queryFn: () => api.messages.getMessages(convId),
    staleTime: 0,
    enabled: !!user,
  })

  // Older messages loaded via cursor pagination (prepended to display)
  const [olderMessages, setOlderMessages] = useState<Message[]>([])
  // null = not started; undefined = exhausted; string = next cursor
  const [userCursor, setUserCursor] = useState<string | undefined | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  // Reset pagination state when switching conversations
  useEffect(() => {
    setOlderMessages([])
    setUserCursor(null)
  }, [convId])

  // nextCursor: use user-tracked cursor once they've started paginating, else use query data
  const nextCursor = userCursor !== null ? userCursor : messagesData?.next_cursor

  const latestMessages = useMemo(
    () => (messagesData?.messages ? [...messagesData.messages].reverse() : []),
    [messagesData]
  )
  const messages = useMemo(
    () => [...olderMessages, ...latestMessages],
    [olderMessages, latestMessages]
  )

  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [menuMsgId, setMenuMsgId] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const initialScrollDone = useRef(false)

  // Reset scroll flag when switching conversations
  useEffect(() => {
    initialScrollDone.current = false
  }, [convId])

  // Scroll to bottom on first message load
  useEffect(() => {
    if (latestMessages.length > 0 && !initialScrollDone.current) {
      initialScrollDone.current = true
      bottomRef.current?.scrollIntoView({ behavior: 'auto' })
    }
  }, [latestMessages])

  // WebSocket for real-time — invalidates queries instead of full reload
  useEffect(() => {
    if (!user) return
    const wsBase = API_BASE.replace(/^http/, 'ws')
    const ws = new WebSocket(`${wsBase}/api/v1/ws/dm/${user.id}`)

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'new_message' && data.conversation_id === convId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.messages(convId) })
          queryClient.invalidateQueries({ queryKey: queryKeys.conversations() })
        }
      } catch { /* ignore */ }
    }

    ws.onopen = () => {
      const hb = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send('ping') }, 25000)
      ws.addEventListener('close', () => clearInterval(hb))
    }

    return () => ws.close()
  }, [user?.id, convId, queryClient])

  const scrollToBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const loadMore = async () => {
    if (!nextCursor) return
    setLoadingMore(true)
    try {
      const data = await api.messages.getMessages(convId, nextCursor)
      setOlderMessages((prev) => [...[...data.messages].reverse(), ...prev])
      setUserCursor(data.next_cursor)
    } catch {
      addToast('Could not load older messages', 'error')
    } finally {
      setLoadingMore(false)
    }
  }

  const handleSend = async () => {
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    setText('')
    const replyId = replyTo?.id
    setReplyTo(null)
    try {
      const msg = await api.messages.send(convId, body, replyId ? { reply_to_id: replyId } : undefined)
      // Optimistically prepend to cache (API returns newest first)
      queryClient.setQueryData<{ messages: Message[]; next_cursor?: string }>(
        queryKeys.messages(convId),
        (old) => old ? { ...old, messages: [msg, ...old.messages] } : old
      )
      scrollToBottom()
    } catch {
      addToast('Failed to send', 'error')
      setText(body)
    } finally {
      setSending(false)
    }
  }

  const handleEdit = async (msgId: string) => {
    const body = editText.trim()
    if (!body) return
    try {
      const updated = await api.messages.edit(convId, msgId, body)
      queryClient.setQueryData<{ messages: Message[]; next_cursor?: string }>(
        queryKeys.messages(convId),
        (old) => old ? { ...old, messages: old.messages.map((m) => m.id === msgId ? updated : m) } : old
      )
      setOlderMessages((prev) => prev.map((m) => m.id === msgId ? updated : m))
    } catch {
      addToast('Failed to edit', 'error')
    } finally {
      setEditingId(null)
      setEditText('')
    }
  }

  const handleDelete = async (msgId: string) => {
    setMenuMsgId(null)
    try {
      await api.messages.delete(convId, msgId)
      const applyDelete = (m: Message): Message =>
        m.id === msgId ? { ...m, is_deleted: true, body: undefined } : m
      queryClient.setQueryData<{ messages: Message[]; next_cursor?: string }>(
        queryKeys.messages(convId),
        (old) => old ? { ...old, messages: old.messages.map(applyDelete) } : old
      )
      setOlderMessages((prev) => prev.map(applyDelete))
    } catch {
      addToast('Failed to delete', 'error')
    }
  }

  const handleAccept = async () => {
    try {
      await api.messages.accept(convId)
      const updateConv = (old: Conversation[] | undefined) =>
        (old ?? []).map((c) => c.id === convId ? { ...c, my_status: 'accepted' as const } : c)
      queryClient.setQueryData<Conversation[]>(queryKeys.conversations(), updateConv)
      queryClient.setQueryData<Conversation[]>(queryKeys.conversationRequests(), updateConv)
      addToast('Request accepted', 'success')
    } catch {
      addToast('Failed to accept', 'error')
    }
  }

  const handleReject = async () => {
    try {
      await api.messages.reject(convId)
      router.push('/messages')
    } catch {
      addToast('Failed to decline', 'error')
    }
  }

  const startEdit = (msg: Message) => {
    setMenuMsgId(null)
    setEditingId(msg.id)
    setEditText(msg.body ?? '')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  if (!user) return null

  const isPending = conv?.my_status === 'pending'
  const otherPending = conv?.request_status === 'pending'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E5E4E2] bg-white flex-shrink-0">
        <button onClick={() => router.push('/messages')} className="text-[#6B7280] hover:text-[#0A0A0A] transition-colors">
          <ArrowLeft size={20} />
        </button>
        {conv ? (
          <Link href={`/u/${conv.other_user.username}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <Avatar src={conv.other_user.avatar_url} name={conv.other_user.display_name} size="sm" />
            <div>
              <p className="text-sm font-semibold text-[#0A0A0A]">{conv.other_user.display_name}</p>
              <p className="text-xs text-[#6B7280]">@{conv.other_user.username}</p>
            </div>
          </Link>
        ) : (
          <div className="w-36 h-8 bg-[#EEF1F3] rounded-full animate-pulse" />
        )}
        {otherPending && (
          <span className="ml-auto text-xs text-[#9CA3AF] bg-[#EEF1F3] px-2 py-1 rounded-full">Request sent</span>
        )}
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1 bg-[#FAFAFA]"
        onClick={() => setMenuMsgId(null)}
      >
        {nextCursor && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="self-center text-xs text-[#536878] hover:text-[#0A0A0A] py-2 disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : 'Load older messages'}
          </button>
        )}

        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-[#9CA3AF]">Say hello 👋</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isOwn = msg.sender_id === user.id
          const prevMsg = i > 0 ? messages[i - 1] : null
          const showDate = !prevMsg || (
            new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()
          )
          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex justify-center my-3">
                  <span className="text-[11px] text-[#9CA3AF] bg-white border border-[#E5E4E2] px-3 py-1 rounded-full">
                    {new Date(msg.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )}
              <MessageBubble
                msg={msg}
                isOwn={isOwn}
                menuOpen={menuMsgId === msg.id}
                onMenuToggle={(open) => setMenuMsgId(open ? msg.id : null)}
                onReply={() => { setReplyTo(msg); inputRef.current?.focus() }}
                onEdit={() => startEdit(msg)}
                onDelete={() => handleDelete(msg.id)}
              />
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Pending request banner */}
      {isPending && (
        <div className="px-4 py-3 border-t border-[#E5E4E2] bg-[#FFF8F0] flex-shrink-0">
          <p className="text-sm text-[#0A0A0A] mb-2.5">
            <span className="font-medium">{conv?.other_user.display_name}</span> wants to send you a message.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleAccept}
              className="flex-1 py-2 rounded-full bg-[#0A0A0A] text-white text-sm font-medium hover:bg-[#1A1A1A] transition-colors"
            >
              Accept
            </button>
            <button
              onClick={handleReject}
              className="flex-1 py-2 rounded-full bg-white border border-[#E5E4E2] text-[#0A0A0A] text-sm font-medium hover:bg-[#EEF1F3] transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      {!isPending && (
        <div className="border-t border-[#E5E4E2] bg-white flex-shrink-0">
          {/* Reply preview */}
          {replyTo && !editingId && (
            <div className="px-4 pt-3 flex items-center gap-2">
              <div className="flex-1 bg-[#EEF1F3] rounded-xl px-3 py-2 border-l-2 border-[#536878]">
                <p className="text-[11px] text-[#536878] font-medium mb-0.5">
                  {replyTo.sender_id === user.id ? 'You' : conv?.other_user.display_name}
                </p>
                <p className="text-xs text-[#6B7280] line-clamp-1">{replyTo.body ?? 'Shared a post'}</p>
              </div>
              <button onClick={() => setReplyTo(null)} className="text-[#9CA3AF] hover:text-[#6B7280]">
                <X size={16} />
              </button>
            </div>
          )}
          {editingId && (
            <div className="px-4 pt-3 flex items-center gap-2">
              <div className="flex-1 bg-[#FFFBEB] rounded-xl px-3 py-2 border-l-2 border-[#F59E0B]">
                <p className="text-[11px] text-[#F59E0B] font-medium">Editing message</p>
              </div>
              <button onClick={() => { setEditingId(null); setEditText('') }} className="text-[#9CA3AF] hover:text-[#6B7280]">
                <X size={16} />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
            <textarea
              ref={inputRef}
              value={editingId ? editText : text}
              onChange={(e) => editingId ? setEditText(e.target.value) : setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  editingId ? handleEdit(editingId) : handleSend()
                }
              }}
              placeholder="Message…"
              rows={1}
              className="flex-1 resize-none rounded-2xl border border-[#E5E4E2] px-4 py-2.5 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:outline-none focus:border-[#536878] max-h-32 overflow-y-auto leading-relaxed"
            />
            <button
              onClick={() => editingId ? handleEdit(editingId) : handleSend()}
              disabled={editingId ? !editText.trim() : (!text.trim() || sending)}
              className="w-10 h-10 rounded-full bg-[#536878] text-white flex items-center justify-center hover:bg-[#3d5060] disabled:opacity-40 transition-colors flex-shrink-0"
            >
              {editingId ? <Check size={18} /> : <Send size={16} />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface BubbleProps {
  msg: Message
  isOwn: boolean
  menuOpen: boolean
  onMenuToggle: (open: boolean) => void
  onReply: () => void
  onEdit: () => void
  onDelete: () => void
}

function MessageBubble({ msg, isOwn, menuOpen, onMenuToggle, onReply, onEdit, onDelete }: BubbleProps) {
  const touchStartX = useRef<number | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const SWIPE_THRESHOLD = 60

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.touches[0].clientX - touchStartX.current
    if (dx > 0 && dx < SWIPE_THRESHOLD + 20) setSwipeOffset(dx)
  }
  const handleTouchEnd = () => {
    if (swipeOffset >= SWIPE_THRESHOLD) onReply()
    setSwipeOffset(0)
    touchStartX.current = null
  }

  const isDeleted = msg.is_deleted

  return (
    <div
      className={cn('flex group mb-1', isOwn ? 'justify-end' : 'justify-start')}
      style={{ transform: `translateX(${isOwn ? -swipeOffset : swipeOffset}px)`, transition: swipeOffset === 0 ? 'transform 0.2s ease' : 'none' }}
    >
      <div
        className={cn('flex flex-col gap-0.5 max-w-[72%]', isOwn ? 'items-end' : 'items-start')}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Reply-to quote */}
        {msg.reply_to && (
          <div className={cn(
            'flex items-start gap-1.5 rounded-xl px-3 py-1.5 text-xs border-l-2 opacity-75 mb-0.5 max-w-full',
            isOwn ? 'bg-[#dde6ec] border-[#536878]' : 'bg-white border-[#D1D5DB] shadow-sm'
          )}>
            <CornerUpLeft size={10} className="flex-shrink-0 mt-0.5 text-[#6B7280]" />
            <p className="text-[#6B7280] line-clamp-1 min-w-0">{msg.reply_to.body ?? 'Shared a post'}</p>
          </div>
        )}

        {/* Shared post card */}
        {msg.shared_post && (
          <Link
            href={`/post/${msg.shared_post.id}`}
            className={cn(
              'flex items-center gap-0 rounded-2xl overflow-hidden border text-left w-full min-w-[200px]',
              isOwn ? 'bg-[#536878] border-[#3d5060]' : 'bg-white border-[#E5E4E2] shadow-sm'
            )}
          >
            {msg.shared_post.thumbnail_url && (
              <div className="w-14 h-14 flex-shrink-0 relative overflow-hidden">
                <Image src={msg.shared_post.thumbnail_url} alt={msg.shared_post.title ?? 'Post'} fill sizes="56px" className="object-cover" />
              </div>
            )}
            <div className="flex-1 py-2 px-3 min-w-0">
              <p className={cn('text-xs font-medium line-clamp-2 leading-snug', isOwn ? 'text-white' : 'text-[#0A0A0A]')}>
                {msg.shared_post.title ?? 'Post'}
              </p>
              {msg.shared_post.source_platform && (
                <p className={cn('text-[10px] mt-0.5', isOwn ? 'text-[rgba(255,255,255,0.55)]' : 'text-[#9CA3AF]')}>
                  {msg.shared_post.source_platform}
                </p>
              )}
            </div>
            <ExternalLink size={12} className={cn('mr-3 flex-shrink-0', isOwn ? 'text-[rgba(255,255,255,0.4)]' : 'text-[#9CA3AF]')} />
          </Link>
        )}

        {/* Message bubble */}
        {(msg.body || isDeleted) && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (isOwn && !isDeleted) onMenuToggle(!menuOpen)
              }}
              className={cn(
                'px-4 py-2.5 rounded-2xl text-sm text-left w-full select-text',
                isDeleted
                  ? 'bg-[#EEF1F3] text-[#9CA3AF] italic'
                  : isOwn
                    ? 'bg-[#536878] text-white'
                    : 'bg-white border border-[#E5E4E2] text-[#0A0A0A] shadow-sm'
              )}
            >
              {isDeleted ? 'This message was deleted' : msg.body}
              {msg.edited_at && !isDeleted && (
                <span className="text-[10px] ml-1.5 opacity-50">(edited)</span>
              )}
            </button>

            {/* Context menu */}
            {menuOpen && isOwn && !isDeleted && (
              <div
                className="absolute bottom-full right-0 mb-1.5 bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.12)] border border-[#E5E4E2] overflow-hidden z-20 min-w-[140px]"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => { onMenuToggle(false); onReply() }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-[#0A0A0A] hover:bg-[#EEF1F3] transition-colors"
                >
                  <Reply size={14} /> Reply
                </button>
                <button
                  onClick={() => onEdit()}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-[#0A0A0A] hover:bg-[#EEF1F3] transition-colors"
                >
                  <Pencil size={14} /> Edit
                </button>
                <div className="h-px bg-[#E5E4E2]" />
                <button
                  onClick={() => onDelete()}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-[#EF4444] hover:bg-[#FEF2F2] transition-colors"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </div>
        )}

        {/* Hover reply for non-own messages (desktop) */}
        {!isOwn && !isDeleted && (
          <button
            onClick={onReply}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-[#C4C9CE] hover:text-[#536878] self-start px-1"
          >
            <Reply size={13} />
          </button>
        )}

        <span className="text-[10px] text-[#C4C9CE] px-1">
          {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}
