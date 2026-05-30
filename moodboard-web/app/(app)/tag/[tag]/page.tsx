import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Hash } from 'lucide-react'
import { MasonryGrid } from '@/components/feed/MasonryGrid'
import { Spinner } from '@/components/ui/Spinner'
import { api } from '@/lib/api'

interface Props {
  params: Promise<{ tag: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params
  return {
    title: `#${decodeURIComponent(tag)}`,
    description: `Posts tagged with #${decodeURIComponent(tag)}`,
  }
}

async function TagPosts({ tag }: { tag: string }) {
  const posts = await api.search.posts(`#${tag}`, 50).catch(() => [])

  return (
    <>
      {posts.length > 0 ? (
        <MasonryGrid posts={posts} />
      ) : (
        <div className="text-center py-20">
          <Hash size={32} className="text-[#E5E4E2] mx-auto mb-3" />
          <p className="text-[#6B7280]">No posts with this tag yet</p>
        </div>
      )}
    </>
  )
}

export default async function TagPage({ params }: Props) {
  const { tag: encodedTag } = await params
  const tag = decodeURIComponent(encodedTag)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 rounded-full bg-[#EEF1F3] flex items-center justify-center">
          <Hash size={18} className="text-[#536878]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A]">#{tag}</h1>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <Spinner className="text-[#536878]" size="lg" />
          </div>
        }
      >
        <TagPosts tag={tag} />
      </Suspense>
    </div>
  )
}
