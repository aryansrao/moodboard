'use client'

import { useEffect } from 'react'
import { useUIStore } from '../stores/ui'
import { useFeedStore } from '../stores/feed'

export function useKeyboard() {
  const { openSaveDialog, setSearchOpen } = useUIStore()
  const { reelActive, setReelActive, reelIndex, setReelIndex, posts } =
    useFeedStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      // Search shortcut — works everywhere
      if (e.key === '/' && !isInput) {
        e.preventDefault()
        setSearchOpen(true)
        return
      }

      // Save shortcut
      if (e.key === 's' && !isInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        openSaveDialog()
        return
      }

      // Escape closes modals / reel
      if (e.key === 'Escape') {
        if (reelActive) {
          setReelActive(false)
        }
        return
      }

      // Reel navigation
      if (reelActive) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault()
          setReelIndex(Math.min(reelIndex + 1, posts.length - 1))
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault()
          setReelIndex(Math.max(reelIndex - 1, 0))
        }
        if (e.key === ' ') {
          e.preventDefault()
          // Space pause handled in ReelMode component
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openSaveDialog, setSearchOpen, reelActive, setReelActive, reelIndex, setReelIndex, posts.length])
}
