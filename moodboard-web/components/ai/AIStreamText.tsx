'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, RefreshCw, Edit3 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIStreamTextProps {
  stream: ReadableStream | null
  onAccept?: (text: string) => void
  onRegenerate?: () => void
  className?: string
}

export function AIStreamText({
  stream,
  onAccept,
  onRegenerate,
  className,
}: AIStreamTextProps) {
  const [text, setText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!stream) {
      setText('')
      setIsDone(false)
      setIsStreaming(false)
      return
    }

    // Guard against React Strict Mode double-invocation
    if (stream.locked) return

    setText('')
    setIsDone(false)
    setIsStreaming(true)

    const decoder = new TextDecoder()
    let reader: ReadableStreamDefaultReader<Uint8Array>

    try {
      reader = stream.getReader()
    } catch {
      setIsStreaming(false)
      return
    }

    let cancelled = false
    let accumulated = ''

    const read = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done || cancelled) break
          const chunk = decoder.decode(value, { stream: true })
          accumulated += chunk
          setText(accumulated)
        }
        if (!cancelled) {
          setIsDone(true)
          setEditValue(accumulated)
        }
      } catch {
        // Stream aborted or errored
      } finally {
        setIsStreaming(false)
      }
    }

    read()

    return () => {
      cancelled = true
      reader.cancel().catch(() => {})
    }
  }, [stream])

  if (!stream && !text) return null

  return (
    <div className={cn('rounded-lg border border-[#E5E4E2] bg-[#FAFAFA] p-3', className)}>
      {isEditing ? (
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-full bg-transparent text-sm text-[#0A0A0A] resize-none focus:outline-none min-h-[60px]"
          autoFocus
        />
      ) : (
        <p
          className={cn(
            'text-sm text-[#0A0A0A] whitespace-pre-wrap',
            isStreaming && 'after:content-["▋"] after:animate-pulse after:text-[#536878]'
          )}
        >
          {text}
        </p>
      )}

      {isDone && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#E5E4E2]">
          <button
            onClick={() => onAccept?.(isEditing ? editValue : text)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#536878] text-white hover:bg-[#445868] transition-colors"
          >
            <Check size={12} />
            Accept
          </button>
          <button
            onClick={() => {
              setIsEditing((e) => !e)
              if (!isEditing) setEditValue(text)
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-[#E5E4E2] text-[#6B7280] hover:bg-[#EEF1F3] transition-colors"
          >
            <Edit3 size={12} />
            {isEditing ? 'Preview' : 'Edit'}
          </button>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-[#E5E4E2] text-[#6B7280] hover:bg-[#EEF1F3] transition-colors"
            >
              <RefreshCw size={12} />
              Regenerate
            </button>
          )}
        </div>
      )}
    </div>
  )
}
