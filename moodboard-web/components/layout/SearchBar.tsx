'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Search, X, Tag, User, LayoutGrid } from 'lucide-react'
import { useSearch } from '@/lib/hooks/useSearch'
import { useUIStore } from '@/lib/stores/ui'
import { cn, truncate, postSlug } from '@/lib/utils'
import { Spinner } from '@/components/ui/Spinner'

export function SearchBar() {
  const { isSearchOpen, setSearchOpen } = useUIStore()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { results, isLoading } = useSearch(query)

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
    }
  }, [isSearchOpen])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSearchOpen) setSearchOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isSearchOpen, setSearchOpen])

  const hasResults =
    results.posts.length > 0 ||
    results.collections.length > 0 ||
    results.users.length > 0 ||
    results.tags.length > 0

  if (!isSearchOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"
        onClick={() => setSearchOpen(false)}
      />

      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E5E4E2]">
          <Search size={18} className="text-[#6B7280] flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts, collections, people, tags…"
            className="flex-1 text-sm text-[#0A0A0A] placeholder-[#6B7280] bg-transparent focus:outline-none"
          />
          {isLoading && <Spinner size="sm" className="text-[#536878]" />}
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-[#6B7280] hover:text-[#0A0A0A] p-0.5"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
          <kbd className="hidden sm:inline text-[10px] text-[#6B7280] bg-[#F3F4F6] px-1.5 py-0.5 rounded">
            Esc
          </kbd>
        </div>

        {/* Results — always show all, no tabs */}
        {query && (
          <div className="max-h-[60vh] overflow-y-auto">
            {!hasResults && !isLoading && (
              <p className="text-sm text-[#6B7280] text-center py-8">
                No results for &ldquo;{query}&rdquo;
              </p>
            )}

            {results.posts.slice(0, 5).map((post) => (
              <Link
                key={post.id}
                href={`/post/${postSlug(post)}`}
                onClick={() => setSearchOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#EEF1F3] transition-colors"
              >
                {post.thumbnail_url ? (
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#EEF1F3] flex-shrink-0">
                    <Image
                      src={post.thumbnail_url}
                      alt={post.title ?? ''}
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[#EEF1F3] flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#0A0A0A] truncate">
                    {post.title ?? 'Untitled'}
                  </p>
                  <p className="text-xs text-[#6B7280]">{post.source_platform}</p>
                </div>
              </Link>
            ))}

            {results.collections.slice(0, 4).map((col) => (
              <Link
                key={col.id}
                href={`/c/${col.slug}`}
                onClick={() => setSearchOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#EEF1F3] transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-[#EEF1F3] flex items-center justify-center flex-shrink-0">
                  <LayoutGrid size={18} className="text-[#536878]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#0A0A0A]">{col.title}</p>
                  <p className="text-xs text-[#6B7280]">{col.post_count} posts</p>
                </div>
              </Link>
            ))}

            {results.users.slice(0, 4).map((u) => (
              <Link
                key={u.id}
                href={`/u/${u.username}`}
                onClick={() => setSearchOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#EEF1F3] transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#EEF1F3] flex items-center justify-center flex-shrink-0">
                  <User size={18} className="text-[#536878]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#0A0A0A]">{u.display_name}</p>
                  <p className="text-xs text-[#6B7280]">@{u.username}</p>
                </div>
              </Link>
            ))}

            {results.tags.slice(0, 6).map((tag) => (
              <Link
                key={tag.name}
                href={`/tag/${encodeURIComponent(tag.name)}`}
                onClick={() => setSearchOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#EEF1F3] transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-[#EEF1F3] flex items-center justify-center flex-shrink-0">
                  <Tag size={16} className="text-[#536878]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#0A0A0A]">#{tag.name}</p>
                  <p className="text-xs text-[#6B7280]">{tag.post_count} posts</p>
                </div>
              </Link>
            ))}

            {hasResults && (
              <div className="border-t border-[#E5E4E2] px-4 py-2.5">
                <Link
                  href={`/search?q=${encodeURIComponent(query)}`}
                  onClick={() => setSearchOpen(false)}
                  className="text-sm text-[#536878] hover:underline"
                >
                  See all results for &ldquo;{query}&rdquo; →
                </Link>
              </div>
            )}
          </div>
        )}

        {!query && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-[#6B7280]">
              Start typing to search across posts, collections, people, and tags
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
