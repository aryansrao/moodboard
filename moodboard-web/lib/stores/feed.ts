import { create } from 'zustand'
import type { Post } from '../types'

type FeedTab = 'for-you' | 'following' | 'trending' | 'collections' | 'new'

interface FeedStore {
  posts: Post[]
  tab: FeedTab
  cursor: string | undefined
  hasMore: boolean
  isLoading: boolean
  reelIndex: number
  reelActive: boolean
  setPosts: (posts: Post[]) => void
  appendPosts: (posts: Post[]) => void
  setTab: (tab: FeedTab) => void
  setCursor: (cursor: string | undefined) => void
  setHasMore: (hasMore: boolean) => void
  setLoading: (loading: boolean) => void
  setReelIndex: (index: number) => void
  setReelActive: (active: boolean) => void
  updatePost: (id: string, patch: Partial<Post>) => void
}

export const useFeedStore = create<FeedStore>((set) => ({
  posts: [],
  tab: 'for-you',
  cursor: undefined,
  hasMore: true,
  isLoading: false,
  reelIndex: 0,
  reelActive: false,
  setPosts: (posts) => set({ posts }),
  appendPosts: (newPosts) =>
    set((state) => ({
      posts: [...state.posts, ...newPosts],
    })),
  setTab: (tab) => set({ tab, posts: [], cursor: undefined, hasMore: true }),
  setCursor: (cursor) => set({ cursor }),
  setHasMore: (hasMore) => set({ hasMore }),
  setLoading: (isLoading) => set({ isLoading }),
  setReelIndex: (reelIndex) => set({ reelIndex }),
  setReelActive: (reelActive) => set({ reelActive }),
  updatePost: (id, patch) =>
    set((state) => ({
      posts: state.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),
}))
