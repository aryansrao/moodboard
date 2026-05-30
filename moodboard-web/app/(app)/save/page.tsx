'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { CreatePostDialog } from '@/components/save/CreatePostDialog'
import { useUIStore } from '@/lib/stores/ui'

export default function SavePage() {
  const searchParams = useSearchParams()
  const { openCreatePost, isCreatePostOpen } = useUIStore()

  useEffect(() => {
    if (isCreatePostOpen) return

    // Web Share Target sends: ?url=, ?title=, ?text=
    // text often contains the URL when sharing from Chrome/Android
    const url = searchParams.get('url') ?? undefined
    const text = searchParams.get('text') ?? undefined
    const title = searchParams.get('title') ?? undefined

    // Resolve the best URL from shared params
    const resolvedUrl = url ?? (text?.startsWith('http') ? text : undefined)

    if (resolvedUrl || url) {
      openCreatePost('link', resolvedUrl)
    } else if (text || title) {
      // Text/title shared without a URL — open link tab anyway, user can paste
      openCreatePost('link', undefined)
    } else {
      openCreatePost('link')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
      <CreatePostDialog />
      {!isCreatePostOpen && (
        <p className="text-[#6B7280] text-sm">Opening…</p>
      )}
    </div>
  )
}
