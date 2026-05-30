import { Suspense } from 'react'
import Link from 'next/link'
import { TrendingUp, Tag } from 'lucide-react'
import { MasonryGrid } from '@/components/feed/MasonryGrid'
import { Spinner } from '@/components/ui/Spinner'
import { api } from '@/lib/api'
import type { Post } from '@/lib/types'

async function TrendingPosts() {
  try {
    const { posts } = await api.feed.trending()
    if (!posts?.length) return <EmptyState message="No trending posts yet." />
    return <MasonryGrid posts={posts.slice(0, 16)} />
  } catch {
    return <EmptyState message="Trending posts couldn't be loaded right now." />
  }
}

async function FeaturedCollections() {
  try {
    // Search with empty-ish query to surface public collections
    const collections = await api.search.collections('design', 6)
    if (!collections?.length) return <EmptyState message="No collections yet." />
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {collections.map((col) => (
          <Link
            key={col.id}
            href={`/c/${col.slug}`}
            className="block bg-white rounded-xl shadow-sm border border-[#E5E4E2] p-4 hover:shadow-md transition-shadow"
          >
            {col.cover_image_url && (
              <img
                src={col.cover_image_url}
                alt={col.title}
                className="w-full h-32 object-cover rounded-lg mb-3"
              />
            )}
            <p className="font-semibold text-[#0A0A0A] truncate">{col.title}</p>
            {col.description && (
              <p className="text-sm text-[#6B7280] mt-1 line-clamp-2">{col.description}</p>
            )}
            <p className="text-xs text-[#536878] mt-2">{col.post_count} posts</p>
          </Link>
        ))}
      </div>
    )
  } catch {
    return <EmptyState message="Collections couldn't be loaded right now." />
  }
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 text-center text-[#6B7280] text-sm">{message}</div>
  )
}

export const metadata = { title: 'Explore — Moodboard' }

export default function ExplorePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[#0A0A0A] mb-8">Explore</h1>

      {/* Trending posts */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-[#536878]" />
          <h2 className="text-lg font-semibold text-[#0A0A0A]">Trending now</h2>
          <Link href="/trending" className="text-sm text-[#536878] hover:underline ml-auto">
            See all →
          </Link>
        </div>
        <Suspense fallback={<div className="flex justify-center py-8"><Spinner /></div>}>
          <TrendingPosts />
        </Suspense>
      </section>

      {/* Featured collections */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-[#0A0A0A]">Featured collections</h2>
          <Link href="/collections" className="text-sm text-[#536878] hover:underline ml-auto">
            Browse all →
          </Link>
        </div>
        <Suspense fallback={<div className="flex justify-center py-8"><Spinner /></div>}>
          <FeaturedCollections />
        </Suspense>
      </section>

      {/* Popular tags */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Tag size={16} className="text-[#536878]" />
          <h2 className="text-lg font-semibold text-[#0A0A0A]">Popular tags</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {['design','photography','architecture','typography','illustration',
            'nature','art','music','film','fashion','minimal','vintage','color','space',
          ].map((tag) => (
            <Link
              key={tag}
              href={`/tag/${tag}`}
              className="px-3 py-1.5 bg-[#EEF1F3] text-[#536878] rounded-full text-sm font-medium hover:bg-[#536878] hover:text-white transition-colors"
            >
              #{tag}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
