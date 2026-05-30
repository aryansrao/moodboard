'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import type { SearchResults } from '../types'

const EMPTY_RESULTS: SearchResults = {
  posts: [],
  collections: [],
  users: [],
  tags: [],
}

export function useSearch(query: string, debounceMs = 300) {
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults(EMPTY_RESULTS)
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      try {
        const data = await api.search.all(query)
        setResults(data)
        setError(null)
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Search failed')
        )
      } finally {
        setIsLoading(false)
      }
    }, debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query, debounceMs])

  return { results, isLoading, error }
}
