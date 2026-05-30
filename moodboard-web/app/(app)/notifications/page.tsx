'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { NotificationItem } from '@/components/social/NotificationItem'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/auth'
import type { Notification } from '@/lib/types'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMarkingRead, setIsMarkingRead] = useState(false)
  const { user } = useAuthStore()
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    // Load initial notifications
    api.notifications
      .list()
      .then((data) => setNotifications(data.notifications))
      .catch(() => {})
      .finally(() => setIsLoading(false))

    // WebSocket for real-time notifications
    if (user && process.env.NEXT_PUBLIC_API_URL) {
      const wsUrl = process.env.NEXT_PUBLIC_API_URL.replace('http', 'ws')
      const ws = new WebSocket(`${wsUrl}/ws/notifications/${user.id}`)
      wsRef.current = ws

      ws.onmessage = (event) => {
        try {
          const notification: Notification = JSON.parse(event.data)
          setNotifications((prev) => [notification, ...prev])
        } catch {
          // ignore malformed messages
        }
      }

      return () => ws.close()
    }
  }, [user])

  const handleMarkAllRead = async () => {
    if (isMarkingRead) return
    setIsMarkingRead(true)
    try {
      await api.notifications.readAll()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } finally {
      setIsMarkingRead(false)
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="text-[#536878]" size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-4">
        <h1 className="text-2xl font-bold text-[#0A0A0A]">Notifications</h1>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            loading={isMarkingRead}
            onClick={handleMarkAllRead}
          >
            <CheckCheck size={16} />
            Mark all read
          </Button>
        )}
      </div>

      {/* Notification list */}
      <div className="bg-white rounded-xl border border-[#E5E4E2] overflow-hidden">
        {notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell size={32} className="text-[#E5E4E2] mx-auto mb-3" />
            <p className="text-[#0A0A0A] font-medium">All caught up!</p>
            <p className="text-sm text-[#6B7280] mt-1">
              Notifications will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E4E2]">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
