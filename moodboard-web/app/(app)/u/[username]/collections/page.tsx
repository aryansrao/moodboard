import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { LayoutGrid } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'
import { api } from '@/lib/api'
import { formatCount } from '@/lib/utils'

interface Props {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  return { title: `@${username}'s collections` }
}

async function UserCollections({ username }: { username: string }) {
  const collections = await api.users.collections(username).catch(() => [])

  if (collections.length === 0) {
    return (
      <div className="text-center py-16">
        <LayoutGrid size={32} className="text-[#E5E4E2] mx-auto mb-3" />
        <p className="text-[#6B7280]">No public collections</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {collections.map((col) => (
        <Link
          key={col.id}
          href={`/c/${col.slug}`}
          className="bg-white rounded-xl border border-[#E5E4E2] overflow-hidden hover:shadow-md transition-shadow"
        >
          <div className="grid grid-cols-2 h-32">
            {(col.posts ?? []).slice(0, 4).map((p, i) => (
              <div key={i} className="relative bg-[#EEF1F3] overflow-hidden">
                {p.thumbnail_url && (
                  <Image
                    src={p.thumbnail_url}
                    alt=""
                    fill
                    className="object-cover"
                  />
                )}
              </div>
            ))}
            {(col.posts?.length ?? 0) === 0 && (
              <div className="col-span-2 flex items-center justify-center bg-[#EEF1F3]">
                <LayoutGrid size={24} className="text-[#6B7280]" />
              </div>
            )}
          </div>
          <div className="p-3">
            <p className="font-semibold text-sm text-[#0A0A0A]">{col.title}</p>
            <p className="text-xs text-[#6B7280] mt-0.5">
              {formatCount(col.post_count)} posts
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}

export default async function UserCollectionsPage({ params }: Props) {
  const { username } = await params
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-[#0A0A0A] mb-6">
        @{username}&apos;s Collections
      </h1>
      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <Spinner className="text-[#536878]" />
          </div>
        }
      >
        <UserCollections username={username} />
      </Suspense>
    </div>
  )
}
