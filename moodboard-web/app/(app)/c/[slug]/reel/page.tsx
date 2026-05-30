'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ReelMode } from '@/components/feed/ReelMode'
import { Spinner } from '@/components/ui/Spinner'
import { api } from '@/lib/api'
import type { Post } from '@/lib/types'

export default function CollectionReelPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!params.slug) return
    api.collections
      .get(params.slug)
      .then((col) => setPosts(col.posts ?? []))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [params.slug])

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Spinner className="text-white" size="lg" />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4">
        <p className="text-white/60">No posts in this collection</p>
        <button
          onClick={() => router.back()}
          className="text-white underline text-sm"
        >
          Go back
        </button>
      </div>
    )
  }

  return (
    <ReelMode
      posts={posts}
      initialIndex={0}
      onClose={() => router.back()}
    />
  )
}
