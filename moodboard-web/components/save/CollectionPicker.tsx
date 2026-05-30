'use client'

import { useState } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'

interface CollectionPickerProps {
  value?: string
  onChange: (collectionId: string | undefined) => void
  dark?: boolean
}

export function CollectionPicker({ value, onChange, dark = false }: CollectionPickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const { data: collections = [], isLoading } = useQuery({
    queryKey: queryKeys.collections(),
    queryFn: () => api.collections.list(),
    staleTime: 60_000,
  })

  const selected = collections.find((c) => c.id === value)

  const triggerClass = dark
    ? cn(
        'w-full flex items-center justify-between px-4 py-2 h-9 rounded-full text-sm',
        'bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white',
        'focus:outline-none focus:border-[rgba(255,255,255,0.25)]',
        'transition-colors duration-150',
      )
    : cn(
        'w-full flex items-center justify-between px-4 py-2 h-9 rounded-full text-sm',
        'bg-white border border-[#E5E4E2]',
        'focus:outline-none focus:border-[#536878]',
        'transition-colors duration-150',
      )

  const dropdownClass = dark
    ? 'absolute top-full left-0 right-0 mt-1 bg-[#1C1C1C] border border-[rgba(255,255,255,0.1)] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.5)] z-10 overflow-hidden max-h-48 overflow-y-auto'
    : 'absolute top-full left-0 right-0 mt-1 bg-white border border-[#E5E4E2] rounded-xl shadow-lg z-10 overflow-hidden max-h-48 overflow-y-auto'

  const optionBase = dark
    ? 'w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[rgba(255,255,255,0.06)]'
    : 'w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[#EEF1F3]'

  const placeholderColor = dark ? 'text-[rgba(255,255,255,0.35)]' : 'text-[#6B7280]'
  const selectedColor = dark ? 'text-white' : 'text-[#0A0A0A]'
  const chevronColor = dark ? 'text-[rgba(255,255,255,0.35)]' : 'text-[#6B7280]'
  const dividerColor = dark ? 'border-[rgba(255,255,255,0.08)]' : 'border-[#E5E4E2]'
  const newLinkColor = dark
    ? 'flex items-center gap-2 px-3 py-2 text-sm text-[#536878] hover:bg-[rgba(255,255,255,0.06)] transition-colors'
    : 'flex items-center gap-2 px-3 py-2 text-sm text-[#536878] hover:bg-[#EEF1F3] transition-colors'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={triggerClass}
      >
        <span className={selected ? selectedColor : placeholderColor}>
          {isLoading
            ? 'Loading…'
            : selected
            ? selected.title
            : 'No collection (unsorted)'}
        </span>
        <ChevronDown
          size={16}
          className={cn(chevronColor, 'transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div className={dropdownClass}>
          <button
            type="button"
            onClick={() => { onChange(undefined); setIsOpen(false) }}
            className={cn(optionBase, placeholderColor)}
          >
            No collection
          </button>

          {collections.map((col) => (
            <button
              key={col.id}
              type="button"
              onClick={() => { onChange(col.id); setIsOpen(false) }}
              className={cn(
                optionBase,
                value === col.id ? 'text-[#536878] font-medium' : selectedColor,
              )}
            >
              {col.title}
              <span className={cn('text-xs ml-1', placeholderColor)}>
                ({col.post_count} posts)
              </span>
            </button>
          ))}

          <div className={cn('border-t', dividerColor)}>
            <a href="/collections/new" className={newLinkColor}>
              <Plus size={14} />
              New collection
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
