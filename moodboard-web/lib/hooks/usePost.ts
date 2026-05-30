'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import type { Post, Comment } from '../types'

interface PostData extends Post {
  comments: Comment[]
  related_posts: Post[]
  is_liked: boolean
  is_saved: boolean
}

export function usePost(id: string) {
  const [data, setData] = useState<PostData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await api.posts.get(id)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load post'))
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const like = useCallback(async () => {
    if (!data) return
    try {
      const { liked } = await api.posts.like(id)
      setData((prev) =>
        prev
          ? {
              ...prev,
              is_liked: liked,
              like_count: liked ? prev.like_count + 1 : prev.like_count - 1,
            }
          : null
      )
    } catch {
      // ignore
    }
  }, [id, data])

  const save = useCallback(
    async (collectionId?: string) => {
      if (!data) return
      try {
        const { saved } = await api.posts.save(id, collectionId)
        setData((prev) =>
          prev
            ? {
                ...prev,
                is_saved: saved,
                save_count: saved ? prev.save_count + 1 : prev.save_count - 1,
              }
            : null
        )
      } catch {
        // ignore
      }
    },
    [id, data]
  )

  const addComment = useCallback(
    async (body: string, parentId?: string) => {
      const comment = await api.posts.addComment(id, body, parentId)
      setData((prev) =>
        prev ? { ...prev, comments: [...prev.comments, comment] } : null
      )
      return comment
    },
    [id]
  )

  return { data, isLoading, error, refetch: load, like, save, addComment }
}
