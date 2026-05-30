'use client'

import { useEffect } from 'react'
import { createClient } from '../supabase'
import { useAuthStore } from '../stores/auth'
import { api } from '../api'
import type { User } from '../types'

let meInFlight = false

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSupabaseUser(u: any): User {
  return {
    id: u.id,
    username: u.user_metadata?.username ?? u.email?.split('@')[0] ?? '',
    display_name: u.user_metadata?.display_name ?? u.email ?? '',
    email: u.email,
    avatar_url: u.user_metadata?.avatar_url,
    bio: u.user_metadata?.bio,
    website: u.user_metadata?.website,
    is_anonymous: u.is_anonymous ?? false,
    interests: u.user_metadata?.interests ?? [],
    created_at: u.created_at,
  }
}

export function useAuth() {
  const { user, isLoading, setUser, setLoading } = useAuthStore()

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(mapSupabaseUser(session.user))
        setLoading(false)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(mapSupabaseUser(session.user))
        setLoading(false)
        if (!meInFlight) {
          meInFlight = true
          api.users.me().then(setUser).catch(() => {}).then(() => { meInFlight = false })
        }
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setLoading])

  return { user, isLoading }
}
