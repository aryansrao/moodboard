'use client'

import { useEffect, useState, useCallback } from 'react'
import { Lock } from 'lucide-react'
import { ProfileHeader } from './ProfileHeader'
import { MasonryGrid } from '@/components/feed/MasonryGrid'
import { Spinner } from '@/components/ui/Spinner'
import { useAuthStore } from '@/lib/stores/auth'
import { api } from '@/lib/api'
import type { User, Post, Collection } from '@/lib/types'

type ProfileUser = User & { follower_count: number; following_count: number; post_count: number }

export function ProfileView({ username }: { username: string }) {
  const { user: currentUser, isLoading: authLoading } = useAuthStore()
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [status, setStatus] = useState<'loading' | 'found' | 'not_found'>('loading')
  const [retries, setRetries] = useState(0)

  const isOwnProfile = !authLoading && currentUser?.username === username

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      const u = await api.users.profile(username)
      setProfileUser(u)
      setStatus('found')
      // Load posts and collections in parallel — failures shouldn't hide the profile
      api.users.posts(username).then((data) => setPosts(data ?? [])).catch(() => {})
      api.users.collections(username).then((data) => setCollections(data ?? [])).catch(() => {})
    } catch {
      // If it's our own profile and user might not be provisioned yet, retry once
      if (isOwnProfile && retries < 2) {
        setTimeout(() => setRetries((r) => r + 1), 1200)
      } else {
        setStatus('not_found')
      }
    }
  }, [username, isOwnProfile, retries])

  useEffect(() => {
    if (authLoading) return
    load()
  }, [username, authLoading, retries]) // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'loading') {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="text-[#536878]" size="lg" />
      </div>
    )
  }

  if (status === 'not_found' || !profileUser) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <p className="text-[#0A0A0A] font-medium text-lg">Profile not found</p>
        <p className="text-sm text-[#6B7280] mt-1">
          @{username} doesn&apos;t exist or their account is private.
        </p>
      </div>
    )
  }

  const isPrivateLocked =
    profileUser.is_private && !profileUser.is_following && !isOwnProfile

  return (
    <>
      <ProfileHeader
        user={profileUser}
        isFollowing={profileUser.is_following ?? false}
        followRequestPending={profileUser.follow_request_pending ?? false}
      />
      <div className="max-w-5xl mx-auto px-4 py-6">
        {isPrivateLocked ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-[#EEF1F3] flex items-center justify-center">
              <Lock size={28} className="text-[#536878]" />
            </div>
            <h2 className="font-semibold text-[#0A0A0A]">This account is private</h2>
            <p className="text-sm text-[#6B7280]">Follow @{username} to see their posts.</p>
          </div>
        ) : (
          <>
            <MasonryGrid posts={posts} collections={collections} />
            {posts.length === 0 && collections.length === 0 && (
              <p className="text-center text-[#6B7280] py-16">No posts yet</p>
            )}
          </>
        )}
      </div>
    </>
  )
}
