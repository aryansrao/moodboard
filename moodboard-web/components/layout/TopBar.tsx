'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search } from 'lucide-react'
import { useUIStore } from '@/lib/stores/ui'
import { cn } from '@/lib/utils'

export function TopBar() {
  const { openSaveDialog } = useUIStore()
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
    }
  }, [searchOpen])

  useEffect(() => {
    if (!searchOpen) return
    const handler = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [searchOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    setSearchOpen(false)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-sm border-b border-[#E5E4E2] h-14 flex items-center px-4 gap-3">
      <Link href="/home" className="flex items-center gap-2 font-bold text-[#0A0A0A]">
        <span className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0">
          <img src="/logo.png" alt="Moodboard" width={28} height={28} className="w-full h-full object-cover" />
        </span>
        <span className="font-[family-name:var(--font-inter-tight)] text-lg">Moodboard</span>
      </Link>

      <div className="ml-auto flex items-center gap-2">
        {/* Expanding search — collapses to circle, expands on click */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className={cn(
            'flex items-center bg-[#F3F4F6] rounded-full transition-all duration-300 ease-in-out overflow-hidden',
            searchOpen ? 'w-52 pl-3 py-1 pr-1' : 'w-10 h-10 p-1'
          )}
        >
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className={cn(
              'bg-transparent text-sm text-[#0A0A0A] outline-none min-w-0 transition-all duration-300',
              searchOpen ? 'flex-1 opacity-100' : 'w-0 flex-none opacity-0 pointer-events-none'
            )}
            onKeyDown={(e) => { if (e.key === 'Escape') setSearchOpen(false) }}
          />
          <button
            type={searchOpen && query.trim() ? 'submit' : 'button'}
            onClick={() => { if (!searchOpen) setSearchOpen(true) }}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[#111] text-white"
            aria-label="Search"
          >
            <Search size={15} />
          </button>
        </form>

        <button
          onClick={() => openSaveDialog()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0A0A0A] text-white text-sm font-medium hover:bg-[#222] active:scale-95 transition-all"
          aria-label="Save new content"
        >
          <Plus size={16} />
          Save
        </button>
      </div>
    </header>
  )
}
