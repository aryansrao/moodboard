'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Compass,
  Search,
  TrendingUp,
  LayoutGrid,
  Bell,
  User,
  Settings,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/lib/stores/ui'
import { useAuthStore } from '@/lib/stores/auth'

const NAV_ITEMS = [
  { href: '/home', label: 'Home', Icon: Home },
  { href: '/explore', label: 'Explore', Icon: Compass },
  { href: '/search', label: 'Search', Icon: Search },
  { href: '/trending', label: 'Trending', Icon: TrendingUp },
  { href: '/collections', label: 'Collections', Icon: LayoutGrid },
  { href: '/notifications', label: 'Notifications', Icon: Bell },
]

export function Sidebar() {
  const pathname = usePathname()
  const { openSaveDialog } = useUIStore()
  const { user } = useAuthStore()

  return (
    <aside className="hidden lg:flex flex-col w-60 fixed left-0 top-0 bottom-0 bg-white border-r border-[#E5E4E2] z-30">
      <div className="px-5 py-5 border-b border-[#E5E4E2]">
        <Link href="/home" className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0">
            <img src="/logo.png" alt="Moodboard" width={28} height={28} className="w-full h-full object-cover" />
          </span>
          <span className="text-xl font-bold text-[#0A0A0A] tracking-tight font-[family-name:var(--font-inter-tight)]">
            Moodboard
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Main navigation">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const isActive = pathname === href || (href !== '/home' && pathname.startsWith(href))
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                    'transition-colors duration-150',
                    isActive
                      ? 'bg-[#EEF1F3] text-[#536878]'
                      : 'text-[#6B7280] hover:bg-[#EEF1F3] hover:text-[#0A0A0A]'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              </li>
            )
          })}

          {user && (
            <li>
              <Link
                href={`/u/${user.username}`}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                  'transition-colors duration-150',
                  pathname.startsWith('/u/')
                    ? 'bg-[#EEF1F3] text-[#536878]'
                    : 'text-[#6B7280] hover:bg-[#EEF1F3] hover:text-[#0A0A0A]'
                )}
              >
                <User size={18} />
                Profile
              </Link>
            </li>
          )}

          <li>
            <Link
              href="/settings"
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                'transition-colors duration-150',
                pathname.startsWith('/settings')
                  ? 'bg-[#EEF1F3] text-[#536878]'
                  : 'text-[#6B7280] hover:bg-[#EEF1F3] hover:text-[#0A0A0A]'
              )}
            >
              <Settings size={18} />
              Settings
            </Link>
          </li>
        </ul>
      </nav>

      <div className="px-3 py-4 border-t border-[#E5E4E2]">
        <button
          onClick={() => openSaveDialog()}
          className={cn(
            'w-full flex items-center justify-center gap-2',
            'px-4 py-2.5 rounded-lg',
            'bg-[#536878] text-white text-sm font-medium',
            'hover:bg-[#445868] active:bg-[#3a4f5c]',
            'transition-colors duration-150'
          )}
          aria-label="Save new content"
        >
          <Plus size={18} />
          Save
        </button>
      </div>
    </aside>
  )
}
