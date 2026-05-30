'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, Lock, Globe, Link2 } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { formatCount } from '@/lib/utils'
import type { Collection } from '@/lib/types'

const VISIBILITY_ICONS = {
  public: Globe,
  private: Lock,
  link_only: Link2,
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api.collections
      .list()
      .then(setCollections)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="text-[#536878]" size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#0A0A0A]">My Collections</h1>
        <Link href="/collections/new">
          <Button>
            <Plus size={16} />
            New Collection
          </Button>
        </Link>
      </div>

      {collections.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-[#EEF1F3] flex items-center justify-center mx-auto mb-4">
            <Globe size={24} className="text-[#536878]" />
          </div>
          <p className="text-[#0A0A0A] font-medium">No collections yet</p>
          <p className="text-sm text-[#6B7280] mt-1 mb-6">
            Organize your saves into collections
          </p>
          <Link href="/collections/new">
            <Button>
              <Plus size={16} />
              Create first collection
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((col) => {
            const VisIcon = VISIBILITY_ICONS[col.visibility]
            return (
              <Link
                key={col.id}
                href={`/c/${col.slug}`}
                className="group bg-white rounded-xl border border-[#E5E4E2] overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Cover / thumbnail grid */}
                {col.cover_image_url ? (
                  <div className="relative h-36 bg-[#EEF1F3]">
                    <Image
                      src={col.cover_image_url}
                      alt={col.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 h-36">
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
                      <div className="col-span-2 bg-[#EEF1F3]" />
                    )}
                  </div>
                )}

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-[#0A0A0A] group-hover:text-[#536878] transition-colors">
                        {col.title}
                      </h3>
                      <p className="text-xs text-[#6B7280] mt-0.5">
                        {formatCount(col.post_count)} posts ·{' '}
                        {formatCount(col.follower_count)} followers
                      </p>
                    </div>
                    <VisIcon size={14} className="text-[#6B7280] flex-shrink-0 mt-0.5" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
