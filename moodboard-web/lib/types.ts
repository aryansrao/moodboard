export interface User {
  id: string
  username: string
  display_name: string
  email?: string
  avatar_url?: string
  banner_url?: string
  bio?: string
  website?: string
  is_anonymous: boolean
  is_private?: boolean
  is_following?: boolean
  follow_request_pending?: boolean
  interests: string[]
  created_at: string
}

export interface FollowRequestItem {
  id: string
  requester: UserMini
  created_at: string
}

export interface UserMini {
  id: string
  username: string
  display_name: string
  avatar_url?: string
}

export interface MediaItem {
  file_url: string
  thumbnail_url?: string
  aspect_ratio?: number
  media_type?: string
}

export interface Post {
  id: string
  user_id: string
  user?: UserMini
  title?: string
  description?: string
  source_url: string
  source_platform: Platform
  media_type: MediaType
  thumbnail_url?: string
  file_url?: string
  embed_url?: string
  og_data?: Record<string, unknown>
  blurhash: string
  aspect_ratio: number
  tags: string[]
  media_items?: MediaItem[]
  is_public: boolean
  is_anonymous: boolean
  is_deleted: boolean
  view_count: number
  save_count: number
  like_count: number
  created_at: string
  updated_at: string
  is_liked?: boolean
  is_saved?: boolean
}

export interface Collection {
  id: string
  user_id: string
  user?: UserMini
  title: string
  description?: string
  slug: string
  cover_image_url?: string
  visibility: 'public' | 'private' | 'link_only'
  is_collaborative: boolean
  follower_count: number
  post_count: number
  posts?: Post[]
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: 'like' | 'save' | 'follow' | 'comment' | 'collection_follow'
  actor?: UserMini
  entity_type?: string
  entity_id?: string
  is_read: boolean
  created_at: string
}

export interface Comment {
  id: string
  post_id: string
  user?: UserMini
  parent_id?: string
  body: string
  upvote_count: number
  replies?: Comment[]
  created_at: string
}

export interface SearchResults {
  posts: Post[]
  collections: Collection[]
  users: UserMini[]
  tags: TagResult[]
}

export interface TagResult {
  name: string
  post_count: number
}

export interface FeedPage {
  posts: Post[]
  next_cursor?: string
}

export interface SharedPostMini {
  id: string
  title?: string
  thumbnail_url?: string
  source_platform?: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id?: string
  sender?: UserMini
  body?: string
  shared_post?: SharedPostMini
  reply_to?: {
    id: string
    body?: string
    sender?: UserMini
  }
  is_deleted: boolean
  edited_at?: string
  created_at: string
}

export interface Conversation {
  id: string
  other_user: UserMini
  my_status: 'accepted' | 'pending'
  request_status: 'accepted' | 'pending'
  last_message?: Message
  unread_count: number
  created_at: string
  updated_at: string
}

export interface PostCreateInput {
  title?: string
  description?: string
  source_url: string
  source_platform?: Platform
  media_type?: MediaType
  thumbnail_url?: string
  file_url?: string
  embed_url?: string
  blurhash?: string
  aspect_ratio?: number
  tags?: string[]
  media_items?: MediaItem[]
  is_public?: boolean
  is_anonymous?: boolean
  collection_id?: string
}

export interface CollectionCreateInput {
  title: string
  description?: string
  visibility?: 'public' | 'private' | 'link_only'
  is_collaborative?: boolean
}

export type AIType = 'title' | 'description' | 'tags' | 'summary'

export interface AIContext {
  url?: string
  image_url?: string
  title?: string
  description?: string
  tags?: string[]
}

export type Platform =
  | 'youtube'
  | 'instagram'
  | 'tiktok'
  | 'pinterest'
  | 'twitter'
  | 'reddit'
  | 'vimeo'
  | 'spotify'
  | 'soundcloud'
  | 'behance'
  | 'dribbble'
  | 'cosmos'
  | 'web'
  | 'upload'

export type MediaType =
  | 'image'
  | 'video'
  | 'video_upload'
  | 'image_upload'
  | 'pdf'
  | 'embed'
  | 'article'
  | 'audio'
