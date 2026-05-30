'use client'

import { useState } from 'react'
import { UserPlus, UserCheck, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'

interface FollowButtonProps {
  userId: string
  initialFollowing?: boolean
  initialRequested?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function FollowButton({
  userId,
  initialFollowing = false,
  initialRequested = false,
  size = 'md',
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing)
  const [isRequested, setIsRequested] = useState(initialRequested)
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    if (isLoading) return
    setIsLoading(true)
    const prevFollowing = isFollowing
    const prevRequested = isRequested
    try {
      const result = await api.users.follow(userId)
      setIsFollowing(result.following)
      setIsRequested(result.requested)
    } catch {
      setIsFollowing(prevFollowing)
      setIsRequested(prevRequested)
    } finally {
      setIsLoading(false)
    }
  }

  if (isFollowing) {
    return (
      <Button
        variant="secondary"
        size={size}
        loading={isLoading}
        onClick={handleClick}
        aria-label="Unfollow user"
      >
        <UserCheck size={14} />
        Following
      </Button>
    )
  }

  if (isRequested) {
    return (
      <Button
        variant="secondary"
        size={size}
        loading={isLoading}
        onClick={handleClick}
        aria-label="Cancel follow request"
      >
        <Clock size={14} />
        Requested
      </Button>
    )
  }

  return (
    <Button
      variant="primary"
      size={size}
      loading={isLoading}
      onClick={handleClick}
      aria-label="Follow user"
    >
      <UserPlus size={14} />
      Follow
    </Button>
  )
}
