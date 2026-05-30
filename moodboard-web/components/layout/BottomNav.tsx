'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, MessageSquare, User, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/stores/auth'
import { useUIStore } from '@/lib/stores/ui'
import { Avatar } from '@/components/ui/Avatar'

export function BottomNav() {
  const pathname = usePathname()
  const { user, cachedAvatar } = useAuthStore()
  const avatarUrl = user?.avatar_url ?? cachedAvatar?.avatar_url
  const avatarName = user?.display_name ?? cachedAvatar?.display_name ?? ''
  const { openCreatePost, closeCreatePost, isCreatePostOpen } = useUIStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const tabs = [
    {
      href: '/home',
      Icon: Home,
      label: 'Home',
      isActive: pathname === '/home',
    },
    {
      href: '/search',
      Icon: Search,
      label: 'Search',
      isActive: pathname.startsWith('/search'),
    },
    {
      href: '/messages',
      Icon: MessageSquare,
      label: 'DMs',
      isActive: pathname.startsWith('/messages'),
    },
    {
      href: user ? `/u/${user.username}` : '/login',
      Icon: User,
      label: 'Profile',
      isActive: pathname.startsWith('/u/'),
    },
  ]

  const isChat = /^\/messages\/.+/.test(pathname)

  if (!mounted || (!user && !cachedAvatar) || isChat) return null

  return (
    <nav
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[51]"
      aria-label="Main navigation"
    >
      <div className="flex items-center gap-1 bg-[#111111] rounded-full p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] border border-[rgba(255,255,255,0.07)]">
        {tabs.slice(0, 2).map(({ href, Icon, label, isActive }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex items-center justify-center w-14 h-12 rounded-full transition-all duration-200',
              isActive
                ? 'bg-[#536878] text-white shadow-[0_2px_10px_rgba(83,104,120,0.45)]'
                : 'text-[rgba(255,255,255,0.45)] hover:text-white hover:bg-[rgba(255,255,255,0.07)]'
            )}
          >
            <Icon size={22} strokeWidth={isActive ? 2 : 1.75} />
          </Link>
        ))}

        {/* Plus → X toggle button */}
        <button
          onClick={() => isCreatePostOpen ? closeCreatePost() : openCreatePost('link')}
          aria-label={isCreatePostOpen ? 'Close' : 'Add to Moodboard'}
          className="flex items-center justify-center w-14 h-12 rounded-full transition-all duration-200 bg-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.18)]"
        >
          <Plus
            size={22}
            strokeWidth={2}
            className={cn('transition-transform duration-300', isCreatePostOpen && 'rotate-45')}
          />
        </button>

        {tabs.slice(2).map(({ href, Icon, label, isActive }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex items-center justify-center w-14 h-12 rounded-full transition-all duration-200',
              label === 'Profile' && user?.avatar_url
                ? ''
                : isActive
                  ? 'bg-[#536878] text-white shadow-[0_2px_10px_rgba(83,104,120,0.45)]'
                  : 'text-[rgba(255,255,255,0.45)] hover:text-white hover:bg-[rgba(255,255,255,0.07)]'
            )}
          >
            {label === 'Profile' && avatarUrl ? (
              <div className={cn(
                'rounded-full overflow-hidden w-10 h-10 transition-all duration-200 flex-shrink-0',
                isActive
                  ? 'ring-2 ring-[#536878] ring-offset-2 ring-offset-[#111111]'
                  : 'opacity-70 hover:opacity-100'
              )}>
                <Avatar src={avatarUrl} name={avatarName} size="md" priority />
              </div>
            ) : (
              <Icon size={22} strokeWidth={isActive ? 2 : 1.75} />
            )}
          </Link>
        ))}
      </div>
    </nav>
  )
}
