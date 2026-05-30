import { create } from 'zustand'
import type { User } from '../types'

const CACHE_KEY = 'mb_user_avatar'

function readCache(): Pick<User, 'avatar_url' | 'display_name'> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeCache(user: User | null) {
  if (typeof window === 'undefined') return
  if (user?.avatar_url) {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      avatar_url: user.avatar_url,
      display_name: user.display_name,
    }))
  } else {
    localStorage.removeItem(CACHE_KEY)
  }
}

interface AuthStore {
  user: User | null
  cachedAvatar: Pick<User, 'avatar_url' | 'display_name'> | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  cachedAvatar: readCache(),
  isLoading: true,
  setUser: (user) => {
    writeCache(user)
    set({ user, cachedAvatar: user ? { avatar_url: user.avatar_url, display_name: user.display_name } : null })
  },
  setLoading: (isLoading) => set({ isLoading }),
}))
