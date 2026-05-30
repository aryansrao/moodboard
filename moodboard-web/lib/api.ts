import { createClient } from './supabase'
import type {
  Post,
  FeedPage,
  Collection,
  Comment,
  SearchResults,
  UserMini,
  TagResult,
  User,
  Notification,
  PostCreateInput,
  CollectionCreateInput,
  AIType,
  AIContext,
  FollowRequestItem,
  Conversation,
  Message,
} from './types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const V1 = `${API_BASE}/api/v1`

async function authHeaders(): Promise<HeadersInit> {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      return {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      }
    }
  } catch {
    // Server context or no session — proceed unauthenticated
  }
  return { 'Content-Type': 'application/json' }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await authHeaders()
  const res = await fetch(`${V1}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as HeadersInit) },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.detail || error.message || `Request failed: ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

async function streamRequest(path: string, body: unknown): Promise<ReadableStream> {
  const headers = await authHeaders()
  const res = await fetch(`${V1}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok || !res.body) {
    throw new Error(`Stream request failed: ${res.status}`)
  }
  return res.body
}

export const api = {
  // ── Feed ──────────────────────────────────────────────────────────────────
  feed: {
    get(cursor?: string): Promise<FeedPage> {
      const p = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
      return request<FeedPage>(`/feed${p}`)
    },
    trending(cursor?: string): Promise<FeedPage> {
      const p = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
      return request<FeedPage>(`/feed/trending${p}`)
    },
    following(cursor?: string): Promise<FeedPage> {
      const p = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
      return request<FeedPage>(`/feed/following${p}`)
    },
  },

  // ── Posts ─────────────────────────────────────────────────────────────────
  posts: {
    create(data: PostCreateInput): Promise<Post> {
      return request<Post>('/posts', { method: 'POST', body: JSON.stringify(data) })
    },
    get(id: string): Promise<Post & { comments: Comment[]; related_posts: Post[]; is_liked: boolean; is_saved: boolean; saved_in_collections: { slug: string; title: string }[] }> {
      return request<Post & { comments: Comment[]; related_posts: Post[]; is_liked: boolean; is_saved: boolean; saved_in_collections: { slug: string; title: string }[] }>(`/posts/${id}`)
    },
    update(id: string, data: Partial<PostCreateInput>): Promise<Post> {
      return request<Post>(`/posts/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
    },
    delete(id: string): Promise<void> {
      return request<void>(`/posts/${id}`, { method: 'DELETE' })
    },
    like(id: string): Promise<{ liked: boolean }> {
      return request<{ liked: boolean }>(`/posts/${id}/like`, { method: 'POST' })
    },
    save(id: string, collectionId?: string): Promise<{ saved: boolean }> {
      return request<{ saved: boolean }>(`/posts/${id}/save`, {
        method: 'POST',
        body: JSON.stringify({ collection_id: collectionId }),
      })
    },
    view(id: string): Promise<void> {
      return request<void>(`/posts/${id}/view`, { method: 'POST' })
    },
    addComment(id: string, body: string, parentId?: string): Promise<Comment> {
      return request<Comment>(`/posts/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body, parent_id: parentId }),
      })
    },
    deleteComment(id: string): Promise<void> {
      return request<void>(`/comments/${id}`, { method: 'DELETE' })
    },
  },

  // ── Media ─────────────────────────────────────────────────────────────────
  media: {
    /** Fetch metadata for a URL (preview before saving). POST /media/fetch */
    fetchMetadata(url: string): Promise<Partial<Post>> {
      return request<Partial<Post>>('/media/fetch', {
        method: 'POST',
        body: JSON.stringify({ url }),
      })
    },
    /** Get a Supabase Storage signed upload URL. Returns upload_url + file_key. */
    initUpload(
      filename: string,
      size: number,
      contentType: string
    ): Promise<{ upload_url: string; file_key: string; expires_in: number }> {
      return request('/media/upload/init', {
        method: 'POST',
        body: JSON.stringify({ filename, size, content_type: contentType }),
      })
    },
    /** Confirm a completed upload and create the Post record. */
    confirmUpload(fileKey: string, title?: string, tags?: string[]): Promise<Post> {
      return request<Post>('/media/upload/confirm', {
        method: 'POST',
        body: JSON.stringify({ file_key: fileKey, title, tags }),
      })
    },
    /** Get a direct download URL for social media content via yt-dlp. */
    downloadUrl(sourceUrl: string): Promise<{ url: string; filename: string; ext: string }> {
      return request('/media/download-url', {
        method: 'POST',
        body: JSON.stringify({ source_url: sourceUrl }),
      })
    },
    /** Proxy-download social media content through the backend (handles CORS + audio). */
    async downloadMedia(sourceUrl: string): Promise<{ blob: Blob; filename: string }> {
      const headers = await authHeaders()
      const res = await fetch(`${V1}/media/download`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ source_url: sourceUrl }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Download failed: ${res.status}`)
      }
      const blob = await res.blob()
      const cd = res.headers.get('Content-Disposition') || ''
      const m = cd.match(/filename="([^"]+)"/)
      return { blob, filename: m?.[1] ?? 'download' }
    },
  },

  // ── Search ────────────────────────────────────────────────────────────────
  // Single FastAPI endpoint: GET /search?q=&type=&limit=
  search: {
    all(q: string, limit = 20): Promise<SearchResults> {
      return request<SearchResults>(`/search?q=${encodeURIComponent(q)}&type=all&limit=${limit}`)
    },
    posts(q: string, limit = 20): Promise<Post[]> {
      return request<SearchResults>(`/search?q=${encodeURIComponent(q)}&type=posts&limit=${limit}`)
        .then((r) => r.posts ?? [])
    },
    collections(q: string, limit = 20): Promise<Collection[]> {
      return request<SearchResults>(`/search?q=${encodeURIComponent(q)}&type=collections&limit=${limit}`)
        .then((r) => r.collections ?? [])
    },
    users(q: string, limit = 20): Promise<UserMini[]> {
      return request<SearchResults>(`/search?q=${encodeURIComponent(q)}&type=users&limit=${limit}`)
        .then((r) => r.users ?? [])
    },
    tags(q: string, limit = 20): Promise<TagResult[]> {
      return request<SearchResults>(`/search?q=${encodeURIComponent(q)}&type=tags&limit=${limit}`)
        .then((r) => r.tags ?? [])
    },
  },

  // ── Collections ───────────────────────────────────────────────────────────
  collections: {
    /** User's own library — requires auth */
    list(): Promise<Collection[]> {
      return request<Collection[]>('/collections')
    },
    /** Public collections from all users — for feed discovery */
    discover(): Promise<Collection[]> {
      return request<Collection[]>('/collections/discover')
    },
    create(data: CollectionCreateInput): Promise<Collection> {
      return request<Collection>('/collections', { method: 'POST', body: JSON.stringify(data) })
    },
    /** Public collection by slug — GET /c/{slug} */
    get(slug: string): Promise<Collection & { posts: Post[] }> {
      return request<Collection & { posts: Post[] }>(`/c/${slug}`)
    },
    update(slug: string, data: Partial<CollectionCreateInput>): Promise<Collection> {
      return request<Collection>(`/c/${slug}`, { method: 'PATCH', body: JSON.stringify(data) })
    },
    addPost(slug: string, postId: string): Promise<void> {
      return request<void>(`/c/${slug}/posts/${postId}`, { method: 'POST' })
    },
    removePost(slug: string, postId: string): Promise<void> {
      return request<void>(`/c/${slug}/posts/${postId}`, { method: 'DELETE' })
    },
    follow(slug: string): Promise<{ following: boolean }> {
      return request<{ following: boolean }>(`/c/${slug}/follow`, { method: 'POST' })
    },
  },

  // ── Users ─────────────────────────────────────────────────────────────────
  users: {
    profile(username: string): Promise<User & { follower_count: number; following_count: number; post_count: number }> {
      return request(`/u/${username}`)
    },
    posts(username: string, cursor?: string): Promise<Post[]> {
      const p = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
      return request<Post[]>(`/u/${username}/posts${p}`)
    },
    collections(username: string): Promise<Collection[]> {
      return request<Collection[]>(`/u/${username}/collections`)
    },
    me(): Promise<User> {
      return request<User>('/me')
    },
    updateProfile(data: Partial<User>): Promise<User> {
      return request<User>('/me', { method: 'PATCH', body: JSON.stringify(data) })
    },
    follow(userId: string): Promise<{ following: boolean; requested: boolean }> {
      return request<{ following: boolean; requested: boolean }>(`/follows/${userId}`, { method: 'POST' })
    },
    followRequests(): Promise<FollowRequestItem[]> {
      return request<FollowRequestItem[]>('/follow-requests')
    },
    acceptFollowRequest(id: string): Promise<void> {
      return request<void>(`/follow-requests/${id}/accept`, { method: 'POST' })
    },
    rejectFollowRequest(id: string): Promise<void> {
      return request<void>(`/follow-requests/${id}/reject`, { method: 'POST' })
    },
  },

  // ── AI ────────────────────────────────────────────────────────────────────
  ai: {
    generate(type: AIType, context: AIContext): Promise<ReadableStream> {
      return streamRequest('/ai/generate', { type, context })
    },
    analyzeImage(imageUrl: string): Promise<{ title: string; tags: string[]; description: string }> {
      return request('/ai/analyze-image', {
        method: 'POST',
        body: JSON.stringify({ image_url: imageUrl }),
      })
    },
  },

  // ── Messages ──────────────────────────────────────────────────────────────
  messages: {
    list(): Promise<Conversation[]> {
      return request<Conversation[]>('/conversations')
    },
    requests(): Promise<Conversation[]> {
      return request<Conversation[]>('/conversations/requests')
    },
    contacts(limit = 10): Promise<UserMini[]> {
      return request<UserMini[]>(`/conversations/contacts?limit=${limit}`)
    },
    start(userId: string): Promise<Conversation> {
      return request<Conversation>('/conversations', { method: 'POST', body: JSON.stringify({ user_id: userId }) })
    },
    accept(convId: string): Promise<void> {
      return request<void>(`/conversations/${convId}/accept`, { method: 'POST' })
    },
    reject(convId: string): Promise<void> {
      return request<void>(`/conversations/${convId}`, { method: 'DELETE' })
    },
    getMessages(convId: string, cursor?: string): Promise<{ messages: Message[]; next_cursor?: string }> {
      const p = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
      return request(`/conversations/${convId}/messages${p}`)
    },
    send(convId: string, body: string, opts?: { reply_to_id?: string; shared_post_id?: string }): Promise<Message> {
      return request<Message>(`/conversations/${convId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body, ...opts }),
      })
    },
    sendPost(convId: string, postId: string, body?: string): Promise<Message> {
      return request<Message>(`/conversations/${convId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ shared_post_id: postId, body: body || null }),
      })
    },
    edit(convId: string, msgId: string, body: string): Promise<Message> {
      return request<Message>(`/conversations/${convId}/messages/${msgId}`, {
        method: 'PATCH',
        body: JSON.stringify({ body }),
      })
    },
    delete(convId: string, msgId: string): Promise<void> {
      return request<void>(`/conversations/${convId}/messages/${msgId}`, { method: 'DELETE' })
    },
  },

  // ── Notifications ─────────────────────────────────────────────────────────
  notifications: {
    list(cursor?: string): Promise<{ notifications: Notification[]; next_cursor?: string }> {
      const p = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
      return request(`/notifications${p}`)
    },
    readAll(): Promise<void> {
      return request<void>('/notifications/read-all', { method: 'POST' })
    },
  },
}
