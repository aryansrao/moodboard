'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/lib/stores/ui'

const URL_REGEX = /https?:\/\/[^\s"'<>]+/i

interface UrlDetectorProps {
  onUrlDetected?: (url: string) => void
}

export function UrlDetector({ onUrlDetected }: UrlDetectorProps) {
  const { openSaveDialog } = useUIStore()

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Don't intercept paste inside inputs/textareas
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      const text = e.clipboardData?.getData('text') ?? ''
      const match = text.match(URL_REGEX)
      if (match) {
        e.preventDefault()
        const url = match[0]
        if (onUrlDetected) {
          onUrlDetected(url)
        } else {
          openSaveDialog(url)
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [openSaveDialog, onUrlDetected])

  return null
}
