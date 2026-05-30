'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

interface AITagSuggestionsProps {
  imageUrl?: string
  url?: string
  onAccept: (tags: string[]) => void
  existingTags?: string[]
}

export function AITagSuggestions({
  imageUrl,
  url,
  onAccept,
  existingTags = [],
}: AITagSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  const loadSuggestions = async () => {
    if (isLoading) return
    setIsLoading(true)
    try {
      if (imageUrl) {
        const result = await api.ai.analyzeImage(imageUrl)
        const newTags = result.tags.filter((t) => !existingTags.includes(t))
        setSuggestions(newTags)
      } else {
        const stream = await api.ai.generate('tags', { url })
        const reader = stream.getReader()
        const decoder = new TextDecoder()
        let text = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          text += decoder.decode(value, { stream: true })
        }
        // Parse comma-separated tags from response
        const tags = text
          .split(',')
          .map((t) => t.trim().replace(/^#/, '').toLowerCase())
          .filter((t) => t.length > 0 && !existingTags.includes(t))
        setSuggestions(tags)
      }
    } catch {
      // fail silently
    } finally {
      setIsLoading(false)
    }
  }

  const toggleTag = (tag: string) => {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  const acceptSelected = () => {
    const tags = Array.from(selected)
    onAccept(tags)
    setSelected(new Set())
    setSuggestions([])
  }

  if (suggestions.length === 0) {
    return (
      <button
        type="button"
        onClick={loadSuggestions}
        disabled={isLoading}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium',
          'text-[#536878] border border-[#536878]/30 bg-[#EEF1F3]',
          'hover:bg-[#536878] hover:text-white hover:border-[#536878]',
          'transition-all duration-150',
          isLoading && 'animate-pulse opacity-70'
        )}
      >
        <Sparkles size={12} />
        {isLoading ? 'Analyzing...' : 'Suggest tags'}
      </button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {suggestions.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => toggleTag(tag)}
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border transition-colors duration-150',
            selected.has(tag)
              ? 'bg-[#536878] text-white border-[#536878]'
              : 'bg-white text-[#536878] border-[#536878]/40 hover:bg-[#EEF1F3]'
          )}
        >
          #{tag}
        </button>
      ))}
      {selected.size > 0 && (
        <button
          type="button"
          onClick={acceptSelected}
          className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#536878] text-white"
        >
          Add {selected.size} tag{selected.size > 1 ? 's' : ''}
        </button>
      )}
    </div>
  )
}
