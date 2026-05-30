'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Globe, Camera, MessageSquare } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { FollowButton } from './FollowButton'
import { formatCount } from '@/lib/utils'
import { useAuthStore } from '@/lib/stores/auth'
import { useUIStore } from '@/lib/stores/ui'
import { api } from '@/lib/api'
import type { User } from '@/lib/types'

interface ProfileHeaderProps {
  user: User & {
    follower_count: number
    following_count: number
    post_count: number
  }
  isFollowing?: boolean
  followRequestPending?: boolean
}

export function ProfileHeader({ user, isFollowing, followRequestPending }: ProfileHeaderProps) {
  const { user: currentUser } = useAuthStore()
  const { addToast } = useUIStore()
  const router = useRouter()
  const isOwn = currentUser?.id === user.id
  const [bannerError, setBannerError] = useState(false)
  const [startingDm, setStartingDm] = useState(false)

  const handleMessage = async () => {
    if (!currentUser) return
    setStartingDm(true)
    try {
      const conv = await api.messages.start(user.id)
      router.push(`/messages/${conv.id}`)
    } catch {
      addToast('Could not open messages', 'error')
    } finally {
      setStartingDm(false)
    }
  }

  return (
    <header className="bg-white border-b border-[#E5E4E2]">
      {/* Banner — contained with same padding as profile content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5">
        <div className="relative overflow-hidden rounded-2xl bg-[#EEF1F3] h-24 sm:h-auto sm:[aspect-ratio:4/1]">
          {user.banner_url && !bannerError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.banner_url}
              alt="Profile banner"
              className="w-full h-full object-cover object-center"
              onError={() => setBannerError(true)}
            />
          ) : (
            <div
              className="w-full h-full"
              style={{ background: 'linear-gradient(135deg, #536878 0%, #7a9bb0 50%, #a8c5d6 100%)' }}
            />
          )}
          <div
            className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.15))' }}
          />
          {isOwn && (
            <Link
              href="/settings"
              className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors group rounded-2xl"
              title="Change banner"
            >
              <Camera size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-5">
        {/* Avatar + actions row */}
        <div className="flex items-end justify-between -mt-10 mb-4">
          <div className="ring-4 ring-white rounded-full">
            <Avatar
              src={user.avatar_url}
              name={user.display_name}
              size="xl"
            />
          </div>

          <div className="flex items-center gap-2 mt-4">
            {isOwn ? (
              <Link
                href="/settings"
                className="px-4 py-2 text-sm font-medium border border-[#E5E4E2] rounded-full text-[#0A0A0A] hover:bg-[#EEF1F3] transition-colors"
              >
                Edit profile
              </Link>
            ) : (
              <>
                <FollowButton
                  userId={user.id}
                  initialFollowing={isFollowing}
                  initialRequested={followRequestPending}
                />
                {currentUser && (
                  <button
                    onClick={handleMessage}
                    disabled={startingDm}
                    className="w-9 h-9 rounded-full border border-[#E5E4E2] flex items-center justify-center text-[#6B7280] hover:bg-[#EEF1F3] hover:text-[#536878] transition-colors disabled:opacity-50"
                    title="Message"
                  >
                    <MessageSquare size={16} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* User info */}
        <div>
          <h1 className="text-xl font-bold text-[#0A0A0A]">
            {user.display_name}
          </h1>
          <p className="text-sm text-[#6B7280] mt-0.5">@{user.username}</p>

          {user.bio && (
            <p className="text-sm text-[#0A0A0A] mt-2 leading-relaxed">
              {user.bio}
            </p>
          )}

          {user.website && (
            <a
              href={user.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-[#536878] mt-1.5 hover:underline"
            >
              <Globe size={13} />
              {user.website.replace(/^https?:\/\//, '')}
            </a>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 mt-4">
            <div className="text-center">
              <p className="font-bold text-[#0A0A0A]">
                {formatCount(user.post_count)}
              </p>
              <p className="text-xs text-[#6B7280]">Posts</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-[#0A0A0A]">
                {formatCount(user.follower_count)}
              </p>
              <p className="text-xs text-[#6B7280]">Followers</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-[#0A0A0A]">
                {formatCount(user.following_count)}
              </p>
              <p className="text-xs text-[#6B7280]">Following</p>
            </div>
          </div>

          {/* Interests */}
          {user.interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {user.interests.map((interest) => (
                <span
                  key={interest}
                  className="text-xs px-2 py-0.5 bg-[#EEF1F3] text-[#536878] rounded-full"
                >
                  {interest}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
