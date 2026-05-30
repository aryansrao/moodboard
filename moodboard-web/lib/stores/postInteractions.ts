import { create } from 'zustand'

interface PostInteractionState {
  isLiked: boolean
  isSaved: boolean
  likeCount?: number
}

interface PostInteractionsStore {
  interactions: Record<string, PostInteractionState>
  setLiked: (postId: string, liked: boolean, likeCount?: number) => void
  setSaved: (postId: string, saved: boolean) => void
  clear: (postId: string) => void
}

export const usePostInteractionsStore = create<PostInteractionsStore>((set) => ({
  interactions: {},
  setLiked: (postId, liked, likeCount) =>
    set((state) => ({
      interactions: {
        ...state.interactions,
        [postId]: {
          ...state.interactions[postId],
          isLiked: liked,
          ...(likeCount !== undefined ? { likeCount } : {}),
        },
      },
    })),
  setSaved: (postId, saved) =>
    set((state) => ({
      interactions: {
        ...state.interactions,
        [postId]: { ...state.interactions[postId], isSaved: saved },
      },
    })),
  clear: (postId) =>
    set((state) => {
      const next = { ...state.interactions }
      delete next[postId]
      return { interactions: next }
    }),
}))
