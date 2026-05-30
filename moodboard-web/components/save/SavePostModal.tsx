'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Loader2, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { useUIStore } from '@/lib/stores/ui'
import { useAuthStore } from '@/lib/stores/auth'
import { api } from '@/lib/api'
import type { Collection } from '@/lib/types'

export function SavePostModal() {
  const { savePostId, savePostOnSaved, closeSavePostModal, addToast } = useUIStore()
  const { user } = useAuthStore()

  const [collections, setCollections] = useState<Collection[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [savingTo, setSavingTo] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (!savePostId || !user) return
    setIsLoading(true)
    setShowCreateForm(false)
    setNewCollectionName('')
    setSavingTo(null)
    api.collections
      .list()
      .then(setCollections)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [savePostId, user])

  const handleSaveTo = async (collectionId: string | undefined, collectionTitle?: string) => {
    if (!savePostId || savingTo !== null) return
    const key = collectionId ?? '__none__'
    setSavingTo(key)
    try {
      const { saved } = await api.posts.save(savePostId, collectionId)
      savePostOnSaved?.(saved)
      addToast(
        saved
          ? collectionTitle
            ? `Saved to "${collectionTitle}"`
            : 'Saved!'
          : 'Removed from saves',
        'success'
      )
      closeSavePostModal()
    } catch {
      addToast('Failed to save', 'error')
      setSavingTo(null)
    }
  }

  const handleCreateAndSave = async () => {
    if (!newCollectionName.trim() || isCreating || !savePostId) return
    setIsCreating(true)
    try {
      const col = await api.collections.create({ title: newCollectionName.trim() })
      await handleSaveTo(col.id, col.title)
    } catch {
      addToast('Failed to create collection', 'error')
      setIsCreating(false)
    }
  }

  if (!savePostId) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
        onClick={closeSavePostModal}
      />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E4E2]">
          <h3 className="font-semibold text-[#0A0A0A] text-sm">Save to collection</h3>
          <button
            onClick={closeSavePostModal}
            className="p-1 text-[#6B7280] hover:text-[#0A0A0A] transition-colors rounded-full hover:bg-[#EEF1F3]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!user ? (
            <p className="text-sm text-[#6B7280] text-center py-8">
              <a href="/login" className="text-[#536878] underline">
                Sign in
              </a>{' '}
              to save posts
            </p>
          ) : isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="sm" className="text-[#536878]" />
            </div>
          ) : (
            <>
              {/* Quick save (no collection) */}
              <button
                onClick={() => handleSaveTo(undefined)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#EEF1F3] transition-colors text-left"
                disabled={savingTo !== null}
              >
                <div className="w-10 h-10 rounded-lg bg-[#EEF1F3] flex items-center justify-center flex-shrink-0">
                  {savingTo === '__none__' ? (
                    <Loader2 size={16} className="animate-spin text-[#536878]" />
                  ) : (
                    <LayoutGrid size={16} className="text-[#536878]" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#0A0A0A]">Quick save</p>
                  <p className="text-xs text-[#6B7280]">Save without a collection</p>
                </div>
              </button>

              {/* User's collections */}
              {collections.map((col) => (
                <button
                  key={col.id}
                  onClick={() => handleSaveTo(col.id, col.title)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#EEF1F3] transition-colors text-left"
                  disabled={savingTo !== null}
                >
                  <div className="w-10 h-10 rounded-lg bg-[#EEF1F3] overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {col.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={col.cover_image_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <LayoutGrid size={16} className="text-[#536878]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#0A0A0A] truncate">{col.title}</p>
                    <p className="text-xs text-[#6B7280]">{col.post_count} posts</p>
                  </div>
                  {savingTo === col.id && (
                    <Loader2 size={14} className="animate-spin text-[#536878] flex-shrink-0" />
                  )}
                </button>
              ))}

              {/* Create new collection */}
              <div className="border-t border-[#E5E4E2]">
                {!showCreateForm ? (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#EEF1F3] transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-lg border-2 border-dashed border-[#E5E4E2] flex items-center justify-center flex-shrink-0">
                      <Plus size={16} className="text-[#6B7280]" />
                    </div>
                    <span className="text-sm text-[#536878] font-medium">New collection</span>
                  </button>
                ) : (
                  <div className="px-4 py-3 flex gap-2">
                    <Input
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      placeholder="Collection name"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateAndSave()
                        if (e.key === 'Escape') setShowCreateForm(false)
                      }}
                    />
                    <Button
                      size="sm"
                      loading={isCreating}
                      onClick={handleCreateAndSave}
                      disabled={!newCollectionName.trim()}
                    >
                      Create
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
