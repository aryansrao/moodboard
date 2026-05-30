'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageSquare, Trash2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Avatar } from '@/components/ui/Avatar'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/auth'
import { queryKeys } from '@/lib/query-keys'
import type { Conversation } from '@/lib/types'
import { cn } from '@/lib/utils'

function msgTime(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffH = diffMs / 3_600_000
  if (diffH < 1) return `${Math.max(1, Math.round(diffMs / 60000))}m`
  if (diffH < 24) return `${Math.round(diffH)}h`
  if (diffH < 168) return d.toLocaleDateString('en-US', { weekday: 'short' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function MessagesPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'all' | 'requests'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: convos = [], isPending } = useQuery({
    queryKey: queryKeys.conversations(),
    queryFn: () => api.messages.list(),
    staleTime: 10_000,
    enabled: !!user,
  })

  const { data: requests = [] } = useQuery({
    queryKey: queryKeys.conversationRequests(),
    queryFn: () => api.messages.requests(),
    staleTime: 10_000,
    enabled: !!user,
  })

  const handleDelete = async (e: React.MouseEvent, convId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this conversation?')) return
    setDeletingId(convId)
    try {
      await api.messages.reject(convId)
      queryClient.setQueryData<Conversation[]>(queryKeys.conversations(), (old) =>
        (old ?? []).filter((c) => c.id !== convId)
      )
      queryClient.setQueryData<Conversation[]>(queryKeys.conversationRequests(), (old) =>
        (old ?? []).filter((c) => c.id !== convId)
      )
    } catch { /* ignore */ } finally {
      setDeletingId(null)
    }
  }

  if (!user) return null

  const items = tab === 'all' ? convos : requests

  return (
    <>
      {/* Mobile: full list (hidden on desktop since layout sidebar handles it) */}
      <div className="lg:hidden flex flex-col h-full overflow-y-auto">
        <div className="px-4 pt-4 pb-3">
          <h1 className="text-xl font-bold text-[#0A0A0A]">Messages</h1>
        </div>

        <div className="px-4 flex gap-1 mb-3">
          {(['all', 'requests'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'relative px-4 py-2 text-sm font-medium rounded-full transition-colors',
                tab === t ? 'bg-[#0A0A0A] text-white' : 'text-[#6B7280] hover:bg-[#EEF1F3]'
              )}
            >
              {t === 'all' ? 'All' : 'Requests'}
              {t === 'requests' && requests.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#536878] text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                  {requests.length > 9 ? '9+' : requests.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {isPending ? (
          <div className="flex flex-col gap-3 px-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-[#EEF1F3] flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-[#EEF1F3] rounded-full w-1/3" />
                  <div className="h-2.5 bg-[#EEF1F3] rounded-full w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-[#EEF1F3] flex items-center justify-center mb-3">
              <MessageSquare size={24} className="text-[#536878]" />
            </div>
            <p className="text-sm font-medium text-[#0A0A0A] mb-1">
              {tab === 'all' ? 'No conversations yet' : 'No requests'}
            </p>
            <p className="text-xs text-[#6B7280]">
              {tab === 'all' ? 'Go to someone\'s profile to message them.' : 'Requests from people you don\'t follow.'}
            </p>
          </div>
        ) : (
          <ul className="px-4 flex flex-col gap-px">
            {items.map((c) => (
              <MobileConvoItem key={c.id} conv={c} onDelete={handleDelete} deletingId={deletingId} />
            ))}
          </ul>
        )}
      </div>

      {/* Desktop: empty state (layout sidebar handles the list) */}
      <div className="hidden lg:flex flex-col items-center justify-center h-full gap-3">
        <div className="w-16 h-16 rounded-full bg-[#EEF1F3] flex items-center justify-center">
          <MessageSquare size={28} className="text-[#536878]" />
        </div>
        <p className="text-sm font-medium text-[#0A0A0A]">Select a conversation</p>
        <p className="text-xs text-[#9CA3AF]">Choose from your messages on the left</p>
      </div>
    </>
  )
}

function MobileConvoItem({
  conv,
  onDelete,
  deletingId,
}: {
  conv: Conversation
  onDelete: (e: React.MouseEvent, id: string) => void
  deletingId: string | null
}) {
  const lastBody = conv.last_message?.is_deleted
    ? 'Message deleted'
    : conv.last_message?.body
      ? conv.last_message.body.length > 44
        ? conv.last_message.body.slice(0, 44) + '…'
        : conv.last_message.body
      : conv.last_message?.shared_post
        ? '📎 Shared a post'
        : null

  return (
    <li>
      <Link
        href={`/messages/${conv.id}`}
        className="flex items-center gap-3 px-2 py-3 rounded-2xl hover:bg-[#F5F5F5] transition-colors group relative"
      >
        <div className="relative flex-shrink-0">
          <Avatar src={conv.other_user.avatar_url} name={conv.other_user.display_name} size="md" />
          {conv.unread_count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#536878] rounded-full border-2 border-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={cn('text-sm truncate', conv.unread_count > 0 ? 'font-semibold text-[#0A0A0A]' : 'font-medium text-[#0A0A0A]')}>
              {conv.other_user.display_name}
            </p>
            <span className="text-[10px] text-[#9CA3AF] flex-shrink-0">
              {conv.last_message ? msgTime(conv.last_message.created_at) : msgTime(conv.created_at)}
            </span>
          </div>
          <p className={cn('text-xs truncate mt-0.5', conv.unread_count > 0 ? 'text-[#0A0A0A]' : 'text-[#9CA3AF]')}>
            {conv.my_status === 'pending'
              ? '📩 Request'
              : conv.request_status === 'pending'
                ? '⏳ Pending'
                : (lastBody ?? 'No messages yet')}
          </p>
        </div>
        <button
          onClick={(e) => onDelete(e, conv.id)}
          disabled={deletingId === conv.id}
          className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-full bg-white border border-[#E5E4E2] flex items-center justify-center text-[#9CA3AF] hover:text-[#EF4444] hover:border-[#EF4444] transition-all shadow-sm disabled:opacity-30 flex-shrink-0"
        >
          <Trash2 size={13} />
        </button>
      </Link>
    </li>
  )
}
