'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Globe, Lock, Link2, Users } from 'lucide-react'
import Link from 'next/link'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AIButton } from '@/components/ai/AIButton'
import { AIStreamText } from '@/components/ai/AIStreamText'
import { api } from '@/lib/api'
import { useUIStore } from '@/lib/stores/ui'
import { cn } from '@/lib/utils'

type Visibility = 'public' | 'private' | 'link_only'

const VISIBILITY_OPTIONS: { id: Visibility; Icon: React.ElementType; label: string; desc: string }[] = [
  { id: 'public', Icon: Globe, label: 'Public', desc: 'Anyone can find and follow' },
  { id: 'private', Icon: Lock, label: 'Private', desc: 'Only you can see' },
  { id: 'link_only', Icon: Link2, label: 'Link only', desc: 'Only people with the link' },
]

export default function NewCollectionPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [isCollaborative, setIsCollaborative] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [titleStream, setTitleStream] = useState<ReadableStream | null>(null)
  const [descStream, setDescStream] = useState<ReadableStream | null>(null)
  const { addToast } = useUIStore()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      const col = await api.collections.create({
        title: title.trim(),
        description: description.trim() || undefined,
        visibility,
        is_collaborative: isCollaborative,
      })
      addToast('Collection created!', 'success')
      router.push(`/c/${col.slug}`)
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Failed to create collection',
        'error'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Link
        href="/collections"
        className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#0A0A0A] mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Back
      </Link>

      <h1 className="text-2xl font-bold text-[#0A0A0A] mb-6">
        New Collection
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Title */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-[#0A0A0A]">Name</label>
            <AIButton
              type="title"
              context={{}}
              onStream={setTitleStream}
              label="Suggest name"
            />
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My collection"
            required
            autoFocus
          />
          {titleStream && (
            <div className="mt-2">
              <AIStreamText
                stream={titleStream}
                onAccept={(t) => {
                  setTitle(t)
                  setTitleStream(null)
                }}
              />
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-[#0A0A0A]">
              Description
            </label>
            <AIButton
              type="description"
              context={{ title }}
              onStream={setDescStream}
              label="Generate"
            />
          </div>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this collection about?"
            rows={3}
          />
          {descStream && (
            <div className="mt-2">
              <AIStreamText
                stream={descStream}
                onAccept={(d) => {
                  setDescription(d)
                  setDescStream(null)
                }}
              />
            </div>
          )}
        </div>

        {/* Visibility */}
        <fieldset>
          <legend className="text-sm font-medium text-[#0A0A0A] mb-2">
            Visibility
          </legend>
          <div className="flex flex-col gap-2">
            {VISIBILITY_OPTIONS.map(({ id, Icon, label, desc }) => (
              <label
                key={id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  visibility === id
                    ? 'border-[#536878] bg-[#EEF1F3]'
                    : 'border-[#E5E4E2] hover:bg-[#FAFAFA]'
                )}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={id}
                  checked={visibility === id}
                  onChange={() => setVisibility(id)}
                  className="sr-only"
                />
                <Icon
                  size={16}
                  className={
                    visibility === id ? 'text-[#536878]' : 'text-[#6B7280]'
                  }
                />
                <div>
                  <p
                    className={cn(
                      'text-sm font-medium',
                      visibility === id ? 'text-[#536878]' : 'text-[#0A0A0A]'
                    )}
                  >
                    {label}
                  </p>
                  <p className="text-xs text-[#6B7280]">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Collaborative toggle */}
        <div className="flex items-center justify-between p-3 border border-[#E5E4E2] rounded-lg">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[#6B7280]" />
            <div>
              <p className="text-sm font-medium text-[#0A0A0A]">
                Collaborative
              </p>
              <p className="text-xs text-[#6B7280]">
                Let others add posts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCollaborative((c) => !c)}
            role="switch"
            aria-checked={isCollaborative}
            className={cn(
              'relative w-10 h-6 rounded-full transition-colors duration-200',
              isCollaborative ? 'bg-[#536878]' : 'bg-[#E5E4E2]'
            )}
          >
            <span
              className={cn(
                'absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
                isCollaborative ? 'translate-x-4' : 'translate-x-0'
              )}
            />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/collections">
            <Button variant="ghost" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" loading={isSubmitting} disabled={!title.trim()}>
            Create Collection
          </Button>
        </div>
      </form>
    </div>
  )
}
