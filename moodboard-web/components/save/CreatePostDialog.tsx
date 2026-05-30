'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { X, Globe, WandSparkles, Plus, ChevronLeft, ChevronRight, UploadCloud } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AIStreamText } from '@/components/ai/AIStreamText'
import { CollectionPicker } from './CollectionPicker'
import { useUIStore } from '@/lib/stores/ui'
import { useAuthStore } from '@/lib/stores/auth'
import { createClient } from '@/lib/supabase'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Post, MediaItem } from '@/lib/types'

// ── helpers ───────────────────────────────────────────────────────────────────

async function drainStream(stream: ReadableStream, onChunk: (text: string) => void): Promise<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const json = JSON.parse(line.slice(6))
        if (json.done) return full
        if (json.chunk) { full += json.chunk; onChunk(full) }
      } catch { /* ignore */ }
    }
  }
  return full
}

interface FileEntry {
  file: File
  previewUrl: string
  uploadedUrl: string | null
  aspectRatio: number
}

// Small AI wand trigger for inside inputs
function WandBtn({
  onClick,
  loading,
  className,
}: {
  onClick: () => void
  loading: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        'shrink-0 p-1.5 rounded-full transition-all',
        'text-[rgba(255,255,255,0.25)] hover:text-[rgba(255,255,255,0.85)] hover:bg-[rgba(255,255,255,0.08)]',
        'disabled:opacity-50',
        className,
      )}
    >
      {loading ? (
        <div
          className="w-[13px] h-[13px] rounded-full animate-spin"
          style={{ border: '1.5px solid rgba(255,255,255,0.15)', borderTopColor: 'rgba(255,255,255,0.7)' }}
        />
      ) : (
        <WandSparkles size={13} strokeWidth={0.5} />
      )}
    </button>
  )
}

// ── shared post fields ────────────────────────────────────────────────────────

interface FieldsProps {
  url?: string
  imageUrl?: string
  title: string; setTitle: (v: string) => void
  titleStream: ReadableStream | null; setTitleStream: (s: ReadableStream | null) => void
  description: string; setDescription: (v: string) => void
  descStream: ReadableStream | null; setDescStream: (s: ReadableStream | null) => void
  tags: string[]; setTags: (fn: (prev: string[]) => string[]) => void
  tagInput: string; setTagInput: (v: string) => void
  collectionId: string | undefined; setCollectionId: (v: string | undefined) => void
  isPublic: boolean; setIsPublic: (fn: (p: boolean) => boolean) => void
}

const inputClass = cn(
  'flex-1 min-w-0 px-4 py-2 text-sm bg-transparent focus:outline-none',
  'text-white placeholder-[rgba(255,255,255,0.3)] rounded-full',
)

const wrapClass = cn(
  'flex items-center border transition-all',
  'bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.1)]',
  'focus-within:border-[rgba(255,255,255,0.25)]',
)

function SharedFields({
  url, imageUrl,
  title, setTitle, titleStream, setTitleStream,
  description, setDescription, descStream, setDescStream,
  tags, setTags, tagInput, setTagInput,
  collectionId, setCollectionId,
  isPublic, setIsPublic,
}: FieldsProps) {
  const [titleAiLoading, setTitleAiLoading] = useState(false)
  const [descAiLoading, setDescAiLoading] = useState(false)
  const [tagsAiLoading, setTagsAiLoading] = useState(false)

  const generateTitle = async () => {
    if (titleAiLoading || titleStream) return
    setTitleAiLoading(true)
    try {
      const stream = await api.ai.generate('title', { url, image_url: imageUrl, tags })
      setTitleStream(stream)
    } catch { /* ignore */ } finally { setTitleAiLoading(false) }
  }

  const generateDesc = async () => {
    if (descAiLoading || descStream) return
    setDescAiLoading(true)
    try {
      const stream = await api.ai.generate('description', { url, image_url: imageUrl, title, tags })
      setDescStream(stream)
    } catch { /* ignore */ } finally { setDescAiLoading(false) }
  }

  const generateTags = async () => {
    if (tagsAiLoading) return
    setTagsAiLoading(true)
    try {
      let newTags: string[]
      if (imageUrl) {
        const result = await api.ai.analyzeImage(imageUrl)
        newTags = result.tags.filter((t: string) => !tags.includes(t))
      } else {
        const stream = await api.ai.generate('tags', { url, title })
        const text = await drainStream(stream, () => {})
        newTags = text
          .split(',')
          .map((t) => t.trim().replace(/^#/, '').toLowerCase())
          .filter((t) => t.length > 0 && !tags.includes(t))
      }
      if (newTags.length > 0) setTags((prev) => [...new Set([...prev, ...newTags])])
    } catch { /* ignore */ } finally { setTagsAiLoading(false) }
  }

  const addTag = (raw: string) => {
    const newTags = raw
      .split(/[,\s]+/)
      .map((t) => t.trim().replace(/^#/, '').toLowerCase())
      .filter((t) => t.length > 0 && !tags.includes(t))
    if (newTags.length > 0) setTags((prev) => [...prev, ...newTags])
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); setTagInput('') }
    if (e.key === 'Backspace' && !tagInput) setTags((prev) => prev.slice(0, -1))
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Title — pill */}
      <div>
        <div className={cn(wrapClass, 'rounded-full')}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className={inputClass}
          />
          <WandBtn onClick={generateTitle} loading={titleAiLoading || !!titleStream} className="mr-1" />
        </div>
        {titleStream && (
          <div className="mt-1.5 px-1">
            <AIStreamText
              stream={titleStream}
              onAccept={(t) => { setTitle(t); setTitleStream(null) }}
              onRegenerate={() => api.ai.generate('title', { url, image_url: imageUrl, tags }).then(setTitleStream).catch(() => {})}
            />
          </div>
        )}
      </div>

      {/* Tags — pill container */}
      <div>
        <div className={cn(wrapClass, 'rounded-2xl flex-wrap gap-1.5 px-3 py-1.5 min-h-[2.5rem] items-center')}>
          {tags.map((tag) => (
            <Badge
              key={tag}
              onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
              className="cursor-pointer hover:opacity-70 bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.75)] border-0"
            >
              #{tag}<X size={10} className="ml-1" />
            </Badge>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={() => { if (tagInput.trim()) { addTag(tagInput); setTagInput('') } }}
            placeholder={tags.length === 0 ? 'Add tags…' : ''}
            className="flex-1 min-w-[60px] text-sm bg-transparent focus:outline-none text-white placeholder-[rgba(255,255,255,0.3)]"
          />
          <WandBtn onClick={generateTags} loading={tagsAiLoading} />
        </div>
        <p className="text-xs text-[rgba(255,255,255,0.25)] mt-0.5 ml-1">Enter or comma to add</p>
      </div>

      {/* Description — rounded textarea, wand in corner */}
      <div className="relative">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          rows={3}
          className={cn(
            'w-full px-4 py-2.5 pb-9 text-sm border rounded-2xl resize-none',
            'bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.1)] text-white',
            'focus:outline-none focus:border-[rgba(255,255,255,0.25)]',
            'placeholder-[rgba(255,255,255,0.3)] transition-all',
          )}
        />
        <div className="absolute bottom-2 right-2">
          <WandBtn onClick={generateDesc} loading={descAiLoading || !!descStream} />
        </div>
        {descStream && (
          <div className="mt-1.5 px-1">
            <AIStreamText
              stream={descStream}
              onAccept={(d) => { setDescription(d); setDescStream(null) }}
              onRegenerate={() => api.ai.generate('description', { url, image_url: imageUrl, title, tags }).then(setDescStream).catch(() => {})}
            />
          </div>
        )}
      </div>

      {/* Collection */}
      <CollectionPicker value={collectionId} onChange={setCollectionId} dark />

      {/* Privacy — 2-way pill */}
      <div className="flex bg-[rgba(255,255,255,0.06)] rounded-full p-1">
        {([true, false] as const).map((pub) => (
          <button
            key={String(pub)}
            type="button"
            onClick={() => setIsPublic(() => pub)}
            className={cn(
              'flex-1 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
              isPublic === pub
                ? 'bg-white text-[#111111] shadow-sm'
                : 'text-[rgba(255,255,255,0.4)] hover:text-white',
            )}
          >
            {pub ? 'Public' : 'Private'}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── collection form ───────────────────────────────────────────────────────────

function CollectionForm({ onClose }: { onClose: () => void }) {
  const { addToast } = useUIStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'link_only' | 'private'>('public')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      await api.collections.create({
        title: name.trim(),
        description: description.trim() || undefined,
        visibility,
      })
      addToast('Collection created!', 'success')
      onClose()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create', 'error')
    } finally { setIsSubmitting(false) }
  }

  const visOptions = [
    { value: 'public' as const, label: 'Public' },
    { value: 'link_only' as const, label: 'Link only' },
    { value: 'private' as const, label: 'Private' },
  ]

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1">
      {/* Fields — flex-1 pushes footer to bottom */}
      <div className="flex flex-col gap-3 flex-1">
        {/* Name */}
        <div className={cn(wrapClass, 'rounded-full')}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Collection name"
            autoFocus
            required
            className={inputClass}
          />
        </div>

        {/* Description */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={4}
          className={cn(
            'w-full px-4 py-2.5 text-sm border rounded-2xl resize-none',
            'bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.1)] text-white',
            'focus:outline-none focus:border-[rgba(255,255,255,0.25)]',
            'placeholder-[rgba(255,255,255,0.3)] transition-all',
          )}
        />

        {/* Visibility segmented pill */}
        <div className="flex bg-[rgba(255,255,255,0.06)] rounded-full p-1">
          {visOptions.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setVisibility(value)}
              className={cn(
                'flex-1 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
                visibility === value
                  ? 'bg-white text-[#111111] shadow-sm'
                  : 'text-[rgba(255,255,255,0.4)] hover:text-white',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Footer pinned to bottom */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-[rgba(255,255,255,0.08)] mt-4 shrink-0">
        <Button variant="ghost" type="button" onClick={onClose}
          className="text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.08)]">
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting} disabled={!name.trim()}>
          Create
        </Button>
      </div>
    </form>
  )
}

// ── unified post form ─────────────────────────────────────────────────────────

function UnifiedForm({ initialUrl, onClose }: { initialUrl?: string; onClose: () => void }) {
  const { addToast } = useUIStore()
  const { user } = useAuthStore()

  const [url, setUrl] = useState(initialUrl ?? '')
  const [isFetchingMeta, setIsFetchingMeta] = useState(false)
  const [preview, setPreview] = useState<Partial<Post> | null>(null)
  const urlDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [entries, setEntries] = useState<FileEntry[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const addMoreRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [collectionId, setCollectionId] = useState<string | undefined>()
  const [isPublic, setIsPublic] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [titleStream, setTitleStream] = useState<ReadableStream | null>(null)
  const [descStream, setDescStream] = useState<ReadableStream | null>(null)

  useEffect(() => {
    if (!url || !url.startsWith('http')) { if (!url) setPreview(null); return }
    if (urlDebounceRef.current) clearTimeout(urlDebounceRef.current)
    urlDebounceRef.current = setTimeout(async () => {
      setIsFetchingMeta(true)
      try {
        const meta = await api.media.fetchMetadata(url)
        setPreview(meta)
        if (meta.title && !title) setTitle(meta.title)
        if (meta.tags?.length && tags.length === 0) setTags(meta.tags)
      } catch { /* ignore */ } finally { setIsFetchingMeta(false) }
    }, 800)
    return () => { if (urlDebounceRef.current) clearTimeout(urlDebounceRef.current) }
  }, [url]) // eslint-disable-line react-hooks/exhaustive-deps

  const makeEntry = useCallback((file: File): FileEntry => {
    const previewUrl = URL.createObjectURL(file)
    const entry: FileEntry = { file, previewUrl, uploadedUrl: null, aspectRatio: 1 }
    if (file.type.startsWith('image/')) {
      const img = new window.Image()
      img.onload = () => {
        if (img.naturalWidth && img.naturalHeight) {
          setEntries((prev) =>
            prev.map((e) => e.previewUrl === previewUrl ? { ...e, aspectRatio: img.naturalWidth / img.naturalHeight } : e)
          )
        }
      }
      img.src = previewUrl
    }
    return entry
  }, [])

  const addFiles = useCallback((files: File[]) => {
    const newEntries = files.map(makeEntry)
    setEntries((prev) => { const next = [...prev, ...newEntries]; setActiveIdx(next.length - 1); return next })
  }, [makeEntry])

  const removeEntry = (idx: number) => {
    setEntries((prev) => {
      URL.revokeObjectURL(prev[idx].previewUrl)
      const next = prev.filter((_, i) => i !== idx)
      setActiveIdx((a) => Math.min(a, Math.max(0, next.length - 1)))
      return next
    })
  }

  const uploadFile = async (entry: FileEntry): Promise<string> => {
    if (!user) throw new Error('Not authenticated')
    if (entry.uploadedUrl) return entry.uploadedUrl
    const supabase = createClient()
    const ext = entry.file.name.split('.').pop() ?? 'bin'
    const path = `${user.id}/posts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('media').upload(path, entry.file, { upsert: true })
    if (error) throw error
    const publicUrl = supabase.storage.from('media').getPublicUrl(path).data.publicUrl
    setEntries((prev) => prev.map((e) => e.previewUrl === entry.previewUrl ? { ...e, uploadedUrl: publicUrl } : e))
    return publicUrl
  }

  const handleGenerateAll = async () => {
    if (isGenerating) return
    const isUploadMode = entries.length > 0 && entries[0].file.type.startsWith('image/')
    if (!url && !isUploadMode) return
    setIsGenerating(true)
    try {
      if (isUploadMode) {
        const publicUrl = await uploadFile(entries[0])
        const result = await api.ai.analyzeImage(publicUrl)
        if (result.title && !title) setTitle(result.title)
        if (result.tags?.length && tags.length === 0) setTags(result.tags)
        if (result.description && !description) setDescription(result.description)
      } else {
        const thumbnailUrl = preview?.thumbnail_url
        let resolvedTitle = title.trim()
        if (!resolvedTitle) {
          const stream = await api.ai.generate('title', { url, image_url: thumbnailUrl })
          setTitle('')
          resolvedTitle = await drainStream(stream, setTitle)
        }
        const [newTags] = await Promise.all([
          (async () => {
            if (thumbnailUrl) {
              const result = await api.ai.analyzeImage(thumbnailUrl)
              return result.tags.filter((t: string) => !tags.includes(t))
            }
            const stream = await api.ai.generate('tags', { url, title: resolvedTitle })
            const text = await drainStream(stream, () => {})
            return text.split(',').map((t) => t.trim().replace(/^#/, '').toLowerCase()).filter((t) => t.length > 0 && !tags.includes(t))
          })(),
          (async () => {
            const stream = await api.ai.generate('description', { url, title: resolvedTitle })
            setDescription('')
            await drainStream(stream, setDescription)
          })(),
        ])
        if (newTags.length > 0) setTags((prev) => [...new Set([...prev, ...newTags])])
      }
    } catch { addToast('Generation failed, try again', 'error') }
    finally { setIsGenerating(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    if (!url && !entries.length) return
    setIsSubmitting(true)
    try {
      if (entries.length > 0) {
        const urls = await Promise.all(entries.map(uploadFile))
        const primary = entries[0]
        const primaryUrl = urls[0]
        const primaryMediaType = primary.file.type.startsWith('video/')
          ? 'video_upload'
          : primary.file.type === 'application/pdf' ? 'pdf' : 'image_upload'
        let mediaItems: MediaItem[] | undefined
        if (entries.length > 1) {
          mediaItems = entries.map((entry, i) => ({
            file_url: urls[i],
            thumbnail_url: entry.file.type.startsWith('image/') ? urls[i] : undefined,
            aspect_ratio: entry.aspectRatio,
            media_type: entry.file.type.startsWith('video/') ? 'video_upload' : entry.file.type === 'application/pdf' ? 'pdf' : 'image_upload',
          }))
        }
        await api.posts.create({
          source_url: primaryUrl, title, description, tags, is_public: isPublic,
          collection_id: collectionId,
          thumbnail_url: primaryMediaType === 'image_upload' ? primaryUrl : undefined,
          file_url: primaryUrl, media_type: primaryMediaType,
          source_platform: 'upload', aspect_ratio: primary.aspectRatio, media_items: mediaItems,
        })
        addToast('Posted!', 'success')
      } else {
        await api.posts.create({
          source_url: url, title, description, tags, is_public: isPublic,
          collection_id: collectionId,
          thumbnail_url: preview?.thumbnail_url,
          blurhash: preview?.blurhash ?? '',
          aspect_ratio: preview?.aspect_ratio ?? 1,
          source_platform: preview?.source_platform,
          media_type: preview?.media_type,
          embed_url: preview?.embed_url,
        })
        addToast('Saved!', 'success')
      }
      onClose()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save', 'error')
    } finally { setIsSubmitting(false) }
  }

  const hasUrl = url.trim().startsWith('http')
  const hasFiles = entries.length > 0
  const active = entries[activeIdx]
  const isVideo = active?.file.type.startsWith('video/')
  const isImage = active?.file.type.startsWith('image/')
  const isPdf = active?.file.type === 'application/pdf'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
      <input ref={fileInputRef} type="file" accept="image/*,video/*,application/pdf" multiple className="hidden"
        onChange={(e) => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = '' }} />
      <input ref={addMoreRef} type="file" accept="image/*,video/*,application/pdf" multiple className="hidden"
        onChange={(e) => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = '' }} />

      {/* Scrollable content */}
      <div
        className="flex flex-col gap-3 flex-1 overflow-y-auto pb-1 min-h-0 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >

      {/* URL input */}
      <div className={cn(
        'relative flex items-center rounded-full border transition-all duration-200',
        'bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.1)]',
        hasFiles
          ? 'opacity-40 pointer-events-none'
          : 'focus-within:border-[rgba(255,255,255,0.25)]',
      )}>
        <Globe size={14} className="absolute left-3.5 text-[rgba(255,255,255,0.35)] shrink-0 pointer-events-none" />
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a link to save…"
          autoFocus={!initialUrl}
          className="flex-1 pl-9 pr-9 py-2.5 text-sm bg-transparent focus:outline-none text-white placeholder-[rgba(255,255,255,0.3)] rounded-full"
        />
        {url && !isFetchingMeta ? (
          <button
            type="button"
            onClick={() => { setUrl(''); setPreview(null) }}
            className="absolute right-3 p-0.5 rounded-full text-[rgba(255,255,255,0.35)] hover:text-[rgba(255,255,255,0.7)] transition-colors"
          >
            <X size={13} />
          </button>
        ) : isFetchingMeta ? (
          <span className="absolute right-3.5 text-xs text-[rgba(255,255,255,0.3)] animate-pulse select-none">⋯</span>
        ) : null}
      </div>

      {/* or divider */}
      {!hasFiles && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[rgba(255,255,255,0.08)]" />
          <span className="text-xs text-[rgba(255,255,255,0.25)]">or</span>
          <div className="flex-1 h-px bg-[rgba(255,255,255,0.08)]" />
        </div>
      )}

      {/* Upload zone / carousel */}
      <div className={cn('transition-all duration-200', hasUrl && !hasFiles && 'opacity-40 pointer-events-none')}>
        {!hasFiles ? (
          <div
            onDrop={(e) => { e.preventDefault(); setIsDragOver(false); addFiles(Array.from(e.dataTransfer.files)) }}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl border-2 border-dashed h-24 cursor-pointer transition-colors',
              isDragOver
                ? 'border-[#536878] bg-[rgba(83,104,120,0.15)]'
                : 'border-[rgba(255,255,255,0.12)] hover:border-[#536878] hover:bg-[rgba(83,104,120,0.08)]',
            )}
          >
            <UploadCloud size={16} className="text-[rgba(255,255,255,0.3)]" />
            <p className="text-sm text-[rgba(255,255,255,0.3)]">Drop files or click to upload</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="relative rounded-xl overflow-hidden bg-[rgba(255,255,255,0.05)]">
              {isVideo && <video src={active.previewUrl} controls className="w-full max-h-56 object-contain" />}
              {isImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={active.previewUrl} alt="Preview" className="w-full max-h-56 object-contain" />
              )}
              {isPdf && (
                <div className="flex flex-col items-center justify-center h-28 gap-1">
                  <p className="text-sm font-medium text-[#536878]">{active.file.name}</p>
                  <p className="text-xs text-[rgba(255,255,255,0.4)]">PDF</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeEntry(activeIdx)}
                className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              >
                <X size={13} />
              </button>
              {activeIdx === 0 && isImage && (
                <button
                  type="button"
                  onClick={handleGenerateAll}
                  disabled={isGenerating}
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium bg-black/60 text-white hover:bg-black/80 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {isGenerating ? 'Generating…' : 'Generate with AI'}
                </button>
              )}
              {entries.length > 1 && (
                <>
                  {activeIdx > 0 && (
                    <button type="button" onClick={() => setActiveIdx((i) => i - 1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80">
                      <ChevronLeft size={16} />
                    </button>
                  )}
                  {activeIdx < entries.length - 1 && (
                    <button type="button" onClick={() => setActiveIdx((i) => i + 1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80">
                      <ChevronRight size={16} />
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {entries.map((entry, i) => (
                <button
                  key={entry.previewUrl}
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  className={cn(
                    'relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors',
                    i === activeIdx ? 'border-[#536878]' : 'border-[rgba(255,255,255,0.1)]',
                  )}
                >
                  {entry.file.type.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={entry.previewUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[9px] text-[rgba(255,255,255,0.5)] font-medium">
                      {entry.file.type.startsWith('video/') ? 'VID' : 'PDF'}
                    </div>
                  )}
                </button>
              ))}
              <button
                type="button"
                onClick={() => addMoreRef.current?.click()}
                className="flex-shrink-0 w-12 h-12 rounded-lg border-2 border-dashed border-[rgba(255,255,255,0.12)] hover:border-[#536878] flex items-center justify-center text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.7)] transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
            {entries.length > 1 && (
              <p className="text-xs text-[rgba(255,255,255,0.3)] text-center">{entries.length} items · carousel</p>
            )}
          </div>
        )}
      </div>

      {/* URL preview thumbnail */}
      {preview?.thumbnail_url && !hasFiles && (
        <div className="relative rounded-xl overflow-hidden bg-[rgba(255,255,255,0.05)] h-36">
          <Image src={preview.thumbnail_url} alt="Preview" fill sizes="(max-width: 640px) 90vw, 480px" className="object-cover" />
        </div>
      )}

      {/* Generate with AI — URL mode */}
      {hasUrl && !hasFiles && (
        <button
          type="button"
          onClick={handleGenerateAll}
          disabled={isGenerating}
          className={cn(
            'w-full py-2 rounded-full text-sm font-medium transition-all duration-200',
            'bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] text-white',
            'hover:bg-[#536878] hover:border-[#536878]',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            isGenerating && 'animate-pulse',
          )}
        >
          {isGenerating ? 'Generating…' : 'Generate with AI'}
        </button>
      )}

      <SharedFields
        url={url}
        imageUrl={preview?.thumbnail_url}
        title={title} setTitle={setTitle}
        titleStream={titleStream} setTitleStream={setTitleStream}
        description={description} setDescription={setDescription}
        descStream={descStream} setDescStream={setDescStream}
        tags={tags} setTags={setTags}
        tagInput={tagInput} setTagInput={setTagInput}
        collectionId={collectionId} setCollectionId={setCollectionId}
        isPublic={isPublic} setIsPublic={setIsPublic}
      />

      </div>{/* end scrollable content */}

      {/* Footer pinned to bottom */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-[rgba(255,255,255,0.08)] shrink-0 mt-1">
        <Button variant="ghost" type="button" onClick={onClose}
          className="text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.08)]">
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting} disabled={!url && !hasFiles}>
          {hasFiles ? 'Create' : 'Create'}
        </Button>
      </div>
    </form>
  )
}

// ── main dialog ───────────────────────────────────────────────────────────────

export function CreatePostDialog() {
  const { isCreatePostOpen, createPostUrl, closeCreatePost } = useUIStore()
  const [mode, setMode] = useState<'post' | 'collection'>('post')

  return (
    <Modal
      open={isCreatePostOpen}
      onClose={closeCreatePost}
      size="xl"
      noControls
      className="bg-[#111111] border border-[rgba(255,255,255,0.07)] shadow-[0_8px_40px_rgba(0,0,0,0.6)] !rounded-[28px] h-[700px] max-h-[92vh]"
      bodyClassName="flex flex-col"
    >
      {/* Custom dark header — no X button, Plus in BottomNav acts as close */}
      <div className="shrink-0 flex items-center px-5 py-3.5 border-b border-[rgba(255,255,255,0.07)]">
        <div className="flex bg-[rgba(255,255,255,0.06)] rounded-full p-1 gap-0.5">
          {(['post', 'collection'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                mode === m
                  ? 'bg-white text-[#111111] shadow-sm'
                  : 'text-[rgba(255,255,255,0.4)] hover:text-white',
              )}
            >
              {m === 'post' ? 'Post' : 'Collection'}
            </button>
          ))}
        </div>
      </div>

      {/* Content — min-h-full so both forms fill the available body space */}
      <div className="px-5 py-4 flex flex-col flex-1 min-h-0">
        {mode === 'post' ? (
          <UnifiedForm
            key={createPostUrl ?? 'unified'}
            initialUrl={createPostUrl}
            onClose={closeCreatePost}
          />
        ) : (
          <CollectionForm key="collection" onClose={closeCreatePost} />
        )}
      </div>
    </Modal>
  )
}
