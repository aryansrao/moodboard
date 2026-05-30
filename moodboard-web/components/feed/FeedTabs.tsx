'use client'

import { cn } from '@/lib/utils'
import { useFeedStore } from '@/lib/stores/feed'

type Tab = {
  id: 'for-you' | 'following' | 'trending' | 'collections' | 'new'
  label: string
}

const TABS: Tab[] = [
  { id: 'for-you', label: 'For You' },
  { id: 'following', label: 'Following' },
  { id: 'trending', label: 'Trending' },
  { id: 'collections', label: 'Collections' },
  { id: 'new', label: 'New' },
]

export function FeedTabs() {
  const { tab, setTab } = useFeedStore()

  return (
    <nav
      className="flex items-center gap-0 border-b border-[#E5E4E2] bg-white sticky top-0 z-10"
      aria-label="Feed tabs"
    >
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          role="tab"
          aria-selected={tab === t.id}
          className={cn(
            'relative px-4 py-3 text-sm font-medium transition-colors duration-150',
            'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full',
            'after:transition-all after:duration-150',
            tab === t.id
              ? 'text-[#536878] after:bg-[#536878]'
              : 'text-[#6B7280] hover:text-[#0A0A0A] after:bg-transparent'
          )}
        >
          {t.label}
        </button>
      ))}
    </nav>
  )
}
