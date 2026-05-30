import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface UIStore {
  toasts: Toast[]
  isCreatePostOpen: boolean
  createPostTab: 'link' | 'upload'
  createPostUrl: string | undefined
  isSearchOpen: boolean
  savePostId: string | undefined
  savePostOnSaved: ((saved: boolean) => void) | null
  addToast: (message: string, type?: ToastType, duration?: number) => void
  removeToast: (id: string) => void
  openCreatePost: (tab?: 'link' | 'upload', url?: string) => void
  closeCreatePost: () => void
  // Compat aliases used by UrlDetector + keyboard shortcut
  openSaveDialog: (url?: string) => void
  closeSaveDialog: () => void
  openUploadDialog: () => void
  closeUploadDialog: () => void
  setSearchOpen: (open: boolean) => void
  openSavePostModal: (postId: string, onSaved?: (saved: boolean) => void) => void
  closeSavePostModal: () => void
}

export const useUIStore = create<UIStore>((set, get) => ({
  toasts: [],
  isCreatePostOpen: false,
  createPostTab: 'link',
  createPostUrl: undefined,
  isSearchOpen: false,
  savePostId: undefined,
  savePostOnSaved: null,

  addToast: (message, type = 'info', duration = 4000) => {
    const id = crypto.randomUUID()
    set((state) => ({ toasts: [...state.toasts, { id, message, type, duration }] }))
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
      }, duration)
    }
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  openCreatePost: (tab = 'link', url) =>
    set({ isCreatePostOpen: true, createPostTab: tab, createPostUrl: url }),

  closeCreatePost: () =>
    set({ isCreatePostOpen: false, createPostUrl: undefined }),

  openSaveDialog: (url) => get().openCreatePost('link', url),
  closeSaveDialog: () => get().closeCreatePost(),
  openUploadDialog: () => get().openCreatePost('upload'),
  closeUploadDialog: () => get().closeCreatePost(),

  setSearchOpen: (isSearchOpen) => set({ isSearchOpen }),

  openSavePostModal: (postId, onSaved) =>
    set({ savePostId: postId, savePostOnSaved: onSaved ?? null }),
  closeSavePostModal: () =>
    set({ savePostId: undefined, savePostOnSaved: null }),
}))
