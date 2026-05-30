'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, Tag, Users, Bookmark } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { Avatar } from '@/components/ui/Avatar'
import { MasonryGrid } from '@/components/feed/MasonryGrid'
import { useSearch } from '@/lib/hooks/useSearch'
import { cn } from '@/lib/utils'
import type { Collection } from '@/lib/types'

type Tab = 'all' | 'posts' | 'collections' | 'people' | 'tags'

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'posts', label: 'Posts' },
  { id: 'collections', label: 'Collections' },
  { id: 'people', label: 'People' },
  { id: 'tags', label: 'Tags' },
]

interface CollectionWithPreviews extends Collection {
  preview_thumbnails?: string[]
}

function CollectionCard({ col }: { col: CollectionWithPreviews }) {
  const thumbs = col.preview_thumbnails ?? []
  const slots = [0, 1, 2, 3]

  return (
    <Link
      href={`/c/${col.slug}`}
      className="flex items-center gap-4 p-3 bg-white rounded-2xl border border-[#E5E4E2] hover:border-[#536878] transition-colors"
    >
      {/* 2×2 thumbnail grid */}
      <div className="w-16 h-16 rounded-xl overflow-hidden grid grid-cols-2 gap-px bg-[#E5E4E2] flex-shrink-0">
        {slots.map((i) =>
          thumbs[i] ? (
            <div key={i} className="relative w-full h-full overflow-hidden bg-[#EEF1F3]">
              <Image
                src={thumbs[i]}
                alt=""
                fill
                sizes="32px"
                className="object-cover"
              />
            </div>
          ) : (
            <div key={i} className="bg-[#EEF1F3]" />
          )
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#0A0A0A] text-sm truncate">{col.title}</p>
        {col.user && (
          <p className="text-xs text-[#6B7280] mt-0.5">@{col.user.username}</p>
        )}
        <div className="flex items-center gap-3 mt-1">
          <span className="flex items-center gap-1 text-[11px] text-[#9CA3AF]">
            <Bookmark size={10} />
            {col.post_count} posts
          </span>
          <span className="flex items-center gap-1 text-[11px] text-[#9CA3AF]">
            <Users size={10} />
            {col.follower_count}
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQ = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(initialQ)
  const [tab, setTab] = useState<Tab>('all')
  const { results, isLoading } = useSearch(query)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/search?q=${encodeURIComponent(query)}`)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-[#0A0A0A] mb-4">Search</h1>

      {/* Search input — pill shape */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search everything…"
            autoFocus
            className="w-full pl-10 pr-4 py-2.5 rounded-full border border-[#E5E4E2] bg-white text-sm text-[#0A0A0A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-0 transition-colors"
          />
        </div>
      </form>

      {/* Tabs */}
      <nav className="flex gap-0 border-b border-[#E5E4E2] mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              tab === t.id
                ? 'text-[#536878] border-[#536878]'
                : 'text-[#6B7280] border-transparent hover:text-[#0A0A0A]'
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner className="text-[#536878]" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && query && (
        <>
          {results.posts.length === 0 &&
            results.collections.length === 0 &&
            results.users.length === 0 &&
            results.tags.length === 0 && (
              <div className="text-center py-16">
                <Search size={40} className="text-[#E5E4E2] mx-auto mb-4" />
                <p className="text-[#0A0A0A] font-medium">No results for &ldquo;{query}&rdquo;</p>
                <p className="text-sm text-[#6B7280] mt-1">
                  Try different keywords or check your spelling
                </p>
              </div>
            )}
        </>
      )}

      {/* No query state */}
      {!query && !isLoading && (
        <div className="text-center py-16">
          <Search size={40} className="text-[#E5E4E2] mx-auto mb-4" />
          <p className="text-[#0A0A0A] font-medium">Search across all content</p>
          <p className="text-sm text-[#6B7280] mt-1">
            Find posts, collections, people, and tags
          </p>
        </div>
      )}

      {/* Results */}
      {query && !isLoading && (
        <div className="flex flex-col gap-8">
          {/* Posts */}
          {(tab === 'all' || tab === 'posts') && results.posts.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-[#0A0A0A] mb-3">Posts</h2>
              <MasonryGrid posts={results.posts} />
            </section>
          )}

          {/* Collections */}
          {(tab === 'all' || tab === 'collections') && results.collections.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-[#0A0A0A] mb-3">Collections</h2>
              <div className="flex flex-col gap-2">
                {(results.collections as CollectionWithPreviews[]).map((col) => (
                  <CollectionCard key={col.id} col={col} />
                ))}
              </div>
            </section>
          )}

          {/* People — pill cards */}
          {(tab === 'all' || tab === 'people') && results.users.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-[#0A0A0A] mb-3">People</h2>
              <div className="flex flex-col gap-2">
                {results.users.map((user) => (
                  <Link
                    key={user.id}
                    href={`/u/${user.username}`}
                    className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-full border border-[#E5E4E2] hover:border-[#536878] transition-colors w-fit max-w-full"
                  >
                    <Avatar
                      src={user.avatar_url}
                      name={user.display_name}
                      size="sm"
                    />
                    <div>
                      <p className="font-medium text-[#0A0A0A] text-sm leading-tight">
                        {user.display_name}
                      </p>
                      <p className="text-xs text-[#6B7280]">@{user.username}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Tags */}
          {(tab === 'all' || tab === 'tags') && results.tags.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-[#0A0A0A] mb-3">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {results.tags.map((tag) => (
                  <Link
                    key={tag.name}
                    href={`/tag/${encodeURIComponent(tag.name)}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EEF1F3] text-[#536878] rounded-full text-sm font-medium hover:bg-[#536878] hover:text-white transition-colors"
                  >
                    <Tag size={12} />
                    #{tag.name}
                    <span className="text-[10px] opacity-70">
                      {tag.post_count}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
