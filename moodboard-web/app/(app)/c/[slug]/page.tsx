import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { Share2, Edit, Lock, Globe, Link2 } from 'lucide-react'
import { MasonryGrid } from '@/components/feed/MasonryGrid'
import { CollectionLikeButton } from '@/components/feed/CollectionLikeButton'
import { Spinner } from '@/components/ui/Spinner'
import { api } from '@/lib/api'
import { formatCount } from '@/lib/utils'
import { createServerSupabaseClient } from '@/lib/supabase-server'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params
    const col = await api.collections.get(slug)
    return {
      title: col.title,
      description: col.description,
      openGraph: {
        images: col.cover_image_url ? [col.cover_image_url] : [],
      },
    }
  } catch {
    return { title: 'Collection' }
  }
}

const VISIBILITY_ICONS = {
  public: Globe,
  private: Lock,
  link_only: Link2,
}

const VISIBILITY_LABELS = {
  public: 'Public',
  private: 'Private',
  link_only: 'Link only',
}

async function CollectionContent({ slug }: { slug: string }) {
  const [collection, supabase] = await Promise.all([
    api.collections.get(slug),
    createServerSupabaseClient(),
  ])

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isOwner = user?.id === collection.user_id

  const VisibilityIcon = VISIBILITY_ICONS[collection.visibility]

  return (
    <div>
      {/* Collection header */}
      <div className="bg-white border-b border-[#E5E4E2]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Cover */}
          {collection.cover_image_url && (
            <div className="relative h-48 rounded-xl overflow-hidden mb-6">
              <Image
                src={collection.cover_image_url}
                alt={collection.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <VisibilityIcon size={14} className="text-[#6B7280]" />
                <span className="text-xs text-[#6B7280]">
                  {VISIBILITY_LABELS[collection.visibility]}
                </span>
              </div>

              <h1 className="text-2xl font-bold text-[#0A0A0A]">
                {collection.title}
              </h1>

              {collection.description && (
                <p className="text-sm text-[#6B7280] mt-2 leading-relaxed">
                  {collection.description}
                </p>
              )}

              <p className="text-sm text-[#6B7280] mt-3">
                <strong className="text-[#0A0A0A]">{formatCount(collection.post_count)}</strong> posts
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <CollectionLikeButton slug={slug} initialCount={collection.follower_count} />
              {isOwner && (
                <Link
                  href={`/c/${slug}/edit`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-[#E5E4E2] rounded-full text-[#0A0A0A] hover:bg-[#EEF1F3] transition-colors"
                >
                  <Edit size={14} />
                  Edit
                </Link>
              )}
              <button className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-[#E5E4E2] rounded-full text-[#0A0A0A] hover:bg-[#EEF1F3] transition-colors">
                <Share2 size={14} />
                Share
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts grid */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {collection.posts && collection.posts.length > 0 ? (
          <MasonryGrid posts={collection.posts} />
        ) : (
          <div className="text-center py-20">
            <p className="text-[#6B7280]">No posts in this collection yet</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Spinner className="text-[#536878]" size="lg" />
        </div>
      }
    >
      <CollectionContent slug={slug} />
    </Suspense>
  )
}
