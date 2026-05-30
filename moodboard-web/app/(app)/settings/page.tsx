'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Camera } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/lib/stores/auth'
import { api } from '@/lib/api'
import { useUIStore } from '@/lib/stores/ui'
import { createClient } from '@/lib/supabase'
import { BannerCropModal } from '@/components/settings/BannerCropModal'

const INTEREST_OPTIONS = [
  'Design', 'Photography', 'Art', 'Architecture', 'Music', 'Film',
  'Fashion', 'Typography', 'Illustration', 'Technology', 'Nature',
  'Travel', 'Food', 'Sports', 'Books', 'Gaming',
]

const SETTINGS_NAV = [
  { href: '/settings', label: 'Account' },
  { href: '/settings/privacy', label: 'Privacy' },
  { href: '/settings/data', label: 'Data & Export' },
]

export default function SettingsPage() {
  const { user, setUser } = useAuthStore()
  const { addToast } = useUIStore()

  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  const [username, setUsername] = useState(user?.username ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [website, setWebsite] = useState(user?.website ?? '')
  const [interests, setInterests] = useState<string[]>(user?.interests ?? [])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setIsUploadingAvatar(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const publicUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
      const updated = await api.users.updateProfile({ avatar_url: publicUrl })
      setUser(updated)
      addToast('Avatar updated!', 'success')
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Failed to upload avatar',
        'error'
      )
    } finally {
      setIsUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setCropFile(file)
    if (bannerInputRef.current) bannerInputRef.current.value = ''
  }

  const handleCropConfirm = async (blob: Blob) => {
    if (!user) return
    setCropFile(null)
    setIsUploadingBanner(true)
    try {
      const supabase = createClient()
      const path = `${user.id}/banner/${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
      if (uploadError) throw uploadError
      const publicUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
      const updated = await api.users.updateProfile({ banner_url: publicUrl })
      setUser(updated)
      addToast('Banner updated!', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to upload banner', 'error')
    } finally {
      setIsUploadingBanner(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const updated = await api.users.updateProfile({
        display_name: displayName,
        username,
        bio,
        website,
        interests,
      })
      setUser(updated)
      addToast('Profile updated!', 'success')
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Failed to update',
        'error'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    )
  }

  return (
    <>
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[#0A0A0A] mb-6">Settings</h1>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <nav className="hidden sm:flex flex-col w-44 flex-shrink-0">
          {SETTINGS_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 text-sm rounded-lg text-[#6B7280] hover:bg-[#EEF1F3] hover:text-[#0A0A0A] transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Main content */}
        <div className="flex-1 flex flex-col gap-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Avatar */}
          <div className="bg-white rounded-xl border border-[#E5E4E2] p-6">
            <h2 className="text-base font-semibold text-[#0A0A0A] mb-4">
              Profile photo
            </h2>
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <div className="relative">
                <Avatar
                  src={user?.avatar_url}
                  name={user?.display_name ?? 'User'}
                  size="xl"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                  aria-label="Change avatar"
                >
                  <Camera size={20} className="text-white" />
                </button>
              </div>
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  loading={isUploadingAvatar}
                  disabled={isUploadingAvatar}
                >
                  Upload photo
                </Button>
                <p className="text-xs text-[#6B7280] mt-1">
                  JPG, PNG up to 5MB
                </p>
              </div>
            </div>
          </div>

          {/* Banner */}
          <div className="bg-white rounded-xl border border-[#E5E4E2] p-6">
            <h2 className="text-base font-semibold text-[#0A0A0A] mb-4">
              Profile banner
            </h2>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleBannerChange}
            />
            <div
              className="relative w-full rounded-lg overflow-hidden cursor-pointer group bg-[#EEF1F3]"
              style={{ aspectRatio: '3 / 1' }}
              onClick={() => bannerInputRef.current?.click()}
            >
              {user?.banner_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.banner_url}
                  alt="Profile banner"
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div
                  className="w-full h-full"
                  style={{ background: 'linear-gradient(to bottom right, #EEF1F3, #dce3e8, #c8d3da)' }}
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                <Camera size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => bannerInputRef.current?.click()}
              loading={isUploadingBanner}
              disabled={isUploadingBanner}
            >
              {isUploadingBanner ? 'Uploading…' : 'Upload banner'}
            </Button>
            <p className="text-xs text-[#6B7280] mt-1">Will be cropped to 3:1 (1500×500 px)</p>
          </div>

          {/* Profile info */}
          <div className="bg-white rounded-xl border border-[#E5E4E2] p-6 flex flex-col gap-4">
            <h2 className="text-base font-semibold text-[#0A0A0A]">
              Profile info
            </h2>
            <Input
              label="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
            <Input
              label="Username"
              value={username}
              onChange={(e) =>
                setUsername(
                  e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                )
              }
              hint="Letters, numbers, underscores"
              required
            />
            <Textarea
              label="Bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell people a little about yourself…"
              rows={3}
            />
            <Input
              label="Website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yoursite.com"
            />
          </div>

          {/* Interests */}
          <div className="bg-white rounded-xl border border-[#E5E4E2] p-6">
            <h2 className="text-base font-semibold text-[#0A0A0A] mb-1">
              Interests
            </h2>
            <p className="text-sm text-[#6B7280] mb-3">
              Helps personalize your feed
            </p>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    interests.includes(interest)
                      ? 'bg-[#536878] text-white border-[#536878]'
                      : 'border-[#E5E4E2] text-[#6B7280] hover:border-[#536878] hover:text-[#536878]'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting}>
              Save changes
            </Button>
          </div>
        </form>

        </div>
      </div>
    </div>

    {cropFile && (
      <BannerCropModal
        file={cropFile}
        onConfirm={handleCropConfirm}
        onCancel={() => setCropFile(null)}
      />
    )}
    </>
  )
}
