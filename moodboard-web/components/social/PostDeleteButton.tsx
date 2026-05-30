'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/auth'

export function PostDeleteButton({ postId, postUserId }: { postId: string; postUserId: string }) {
  const { user } = useAuthStore()
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  if (!user || user.id !== postUserId) return null

  const handleDelete = async () => {
    if (!confirm('Delete this post? This cannot be undone.')) return
    setIsDeleting(true)
    try {
      await api.posts.delete(postId)
      router.push('/home')
    } catch {
      setIsDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#EF4444] transition-colors disabled:opacity-50"
    >
      <Trash2 size={16} />
      {isDeleting ? 'Deleting…' : 'Delete'}
    </button>
  )
}
