'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LayoutGrid } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/auth'

interface PostSavedInProps {
  postId: string
}

export function PostSavedIn({ postId }: PostSavedInProps) {
  const { user } = useAuthStore()
  const [collections, setCollections] = useState<{ slug: string; title: string }[]>([])

  useEffect(() => {
    if (!user) return
    api.posts.get(postId).then((p) => {
      setCollections(p.saved_in_collections ?? [])
    }).catch(() => {})
  }, [postId, user])

  if (!user || collections.length === 0) return null

  return (
    <div>
      <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest mb-2">
        Saved in
      </p>
      <div className="flex flex-wrap gap-2">
        {collections.map((col) => (
          <Link
            key={col.slug}
            href={`/c/${col.slug}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EEF1F3] hover:bg-[#dce3e8] rounded-full text-sm font-medium text-[#536878] transition-colors"
          >
            <LayoutGrid size={12} />
            {col.title}
          </Link>
        ))}
      </div>
    </div>
  )
}
