'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'all' | 'requests'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const activeId = pathname.match(/^\/messages\/([^/]+)/)?.[1]

  const { data: convos = [] } = useQuery({
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
      if (activeId === convId) router.push('/messages')
    } catch { /* ignore */ } finally {
      setDeletingId(null)
    }
  }

  const items = tab === 'all' ? convos : requests

  const SidebarItem = ({ conv }: { conv: Conversation }) => {
    const isActive = conv.id === activeId
    const lastBody = conv.last_message?.is_deleted
      ? 'Message deleted'
      : conv.last_message?.body
        ? conv.last_message.body.length > 36
          ? conv.last_message.body.slice(0, 36) + '…'
          : conv.last_message.body
        : conv.last_message?.shared_post
          ? '📎 Shared a post'
          : null

    return (
      <Link
        href={`/messages/${conv.id}`}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors relative group',
          isActive ? 'bg-[#EEF1F3]' : 'hover:bg-[#F5F5F5]'
        )}
      >
        <div className="relative flex-shrink-0">
          <Avatar src={conv.other_user.avatar_url} name={conv.other_user.display_name} size="sm" />
          {conv.unread_count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#536878] rounded-full border-2 border-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className={cn('text-sm truncate', conv.unread_count > 0 ? 'font-semibold text-[#0A0A0A]' : 'font-medium text-[#0A0A0A]')}>
              {conv.other_user.display_name}
            </p>
            <span className="text-[10px] text-[#9CA3AF] flex-shrink-0 ml-2">
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
          onClick={(e) => handleDelete(e, conv.id)}
          disabled={deletingId === conv.id}
          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full bg-white border border-[#E5E4E2] flex items-center justify-center text-[#9CA3AF] hover:text-[#EF4444] hover:border-[#EF4444] transition-all shadow-sm disabled:opacity-30"
          title="Delete conversation"
        >
          <Trash2 size={12} />
        </button>
      </Link>
    )
  }

  return (
    <div className="flex h-[100dvh] -mb-32 bg-white">
      {/* ── Left panel (desktop only) ── */}
      <div className="hidden lg:flex flex-col w-[320px] xl:w-[360px] border-r border-[#E5E4E2] flex-shrink-0 overflow-hidden">
        <div className="px-4 pt-5 pb-3 flex-shrink-0">
          <h1 className="text-xl font-bold text-[#0A0A0A]">Messages</h1>
        </div>

        <div className="px-4 flex gap-1 mb-2 flex-shrink-0">
          {(['all', 'requests'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'relative px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors',
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

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquare size={28} className="text-[#D1D5DB] mb-2" />
              <p className="text-xs text-[#9CA3AF]">
                {tab === 'all' ? 'No conversations yet' : 'No requests'}
              </p>
            </div>
          ) : (
            items.map((c) => <SidebarItem key={c.id} conv={c} />)
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#FAFAFA]">
        {children}
      </div>
    </div>
  )
}
