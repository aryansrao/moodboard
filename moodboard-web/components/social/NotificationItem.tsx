import Link from 'next/link'
import { Heart, Bookmark, UserPlus, MessageCircle, LayoutGrid } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { formatRelative, cn } from '@/lib/utils'
import type { Notification } from '@/lib/types'

const ICON_MAP = {
  like: { Icon: Heart, color: 'text-[#EF4444]' },
  save: { Icon: Bookmark, color: 'text-[#536878]' },
  follow: { Icon: UserPlus, color: 'text-[#22C55E]' },
  comment: { Icon: MessageCircle, color: 'text-[#6B7280]' },
  collection_follow: { Icon: LayoutGrid, color: 'text-[#536878]' },
}

const MESSAGES: Record<Notification['type'], string> = {
  like: 'liked your post',
  save: 'saved your post',
  follow: 'started following you',
  comment: 'commented on your post',
  collection_follow: 'followed your collection',
}

interface NotificationItemProps {
  notification: Notification
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const { Icon, color } = ICON_MAP[notification.type]
  const message = MESSAGES[notification.type]

  const href = notification.entity_type === 'post' && notification.entity_id
    ? `/post/${notification.entity_id}`
    : notification.actor
    ? `/u/${notification.actor.username}`
    : '#'

  return (
    <Link
      href={href}
      className={cn(
        'flex items-start gap-3 px-4 py-3 transition-colors',
        'hover:bg-[#EEF1F3]',
        !notification.is_read && 'bg-[#EEF1F3]/60'
      )}
    >
      {/* Actor avatar with type icon overlay */}
      <div className="relative flex-shrink-0">
        <Avatar
          src={notification.actor?.avatar_url}
          name={notification.actor?.display_name ?? 'Someone'}
          size="sm"
        />
        <div
          className={cn(
            'absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow',
            color
          )}
        >
          <Icon size={9} />
        </div>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#0A0A0A]">
          <span className="font-medium">
            {notification.actor?.display_name ?? 'Someone'}
          </span>{' '}
          {message}
        </p>
        <p className="text-xs text-[#6B7280] mt-0.5">
          {formatRelative(notification.created_at)}
        </p>
      </div>

      {/* Unread indicator */}
      {!notification.is_read && (
        <div className="w-2 h-2 rounded-full bg-[#536878] flex-shrink-0 mt-1.5" />
      )}
    </Link>
  )
}
