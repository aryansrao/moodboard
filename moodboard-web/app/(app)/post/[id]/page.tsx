import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Suspense } from 'react'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { CommentThread } from '@/components/social/CommentThread'
import { PostActions } from '@/components/social/PostActions'
import { PostSavedIn } from '@/components/social/PostSavedIn'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { EmbedRenderer } from '@/components/media/EmbedRenderer'
import { VideoPlayer } from '@/components/media/VideoPlayer'
import { MediaCarousel } from '@/components/media/MediaCarousel'
import { MasonryGrid } from '@/components/feed/MasonryGrid'
import { Spinner } from '@/components/ui/Spinner'
import { api } from '@/lib/api'
import { formatDate, platformName } from '@/lib/utils'

interface Props {
  params: Promise<{ id: string }>
}

function extractPostId(slug: string): string {
  const uuidMatch = slug.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  return uuidMatch ? uuidMatch[0] : slug
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { id } = await params
    const postId = extractPostId(id)
    const post = await api.posts.get(postId)
    return {
      title: post.title ?? 'Post',
      description: post.description,
      alternates: { canonical: `${BASE_URL}/post/${postId}` },
      openGraph: {
        images: post.thumbnail_url ? [post.thumbnail_url] : [],
        type: 'article',
      },
    }
  } catch {
    return { title: 'Post' }
  }
}

async function PostDetails({ id }: { id: string }) {
  const postId = extractPostId(id)
  let post: Awaited<ReturnType<typeof api.posts.get>>
  try {
    post = await api.posts.get(postId)
  } catch (err) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center gap-3">
        <p className="text-[#0A0A0A] font-medium text-lg">Could not load post</p>
        <p className="text-sm text-[#6B7280]">{err instanceof Error ? err.message : 'Something went wrong'}</p>
        <Link href="/home" className="text-sm text-[#536878] hover:underline">Go home</Link>
      </div>
    )
  }

  const isCarousel = (post.media_items?.length ?? 0) > 1
  const isVideoUpload = post.media_type === 'video_upload'
  const isImageUpload = post.media_type === 'image_upload'
  const hasLocalFile = isVideoUpload || isImageUpload
  const isEmbed = !hasLocalFile && !isCarousel && ['youtube', 'vimeo', 'tiktok', 'spotify', 'instagram', 'pinterest'].includes(post.source_platform)
  const isPdf = !isCarousel && (post.media_type === 'pdf' || !!post.file_url?.toLowerCase().endsWith('.pdf'))
  const isImage = !isCarousel && !isPdf && ['image', 'image_upload'].includes(post.media_type)
  const hasMedia = isCarousel || isEmbed || isVideoUpload || isImage || isPdf
  // Never use a PDF URL as an image src
  const displayThumbnail = post.thumbnail_url && !post.thumbnail_url.toLowerCase().endsWith('.pdf')
    ? post.thumbnail_url
    : (!isPdf ? post.file_url : null)

  return (
    <div style={{ viewTransitionName: `post-${postId}` }}>
      {/* Back nav */}
      <div className="px-4 md:px-8 lg:px-12 pt-5 pb-3">
        <Link
          href="/home"
          className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#0A0A0A] transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </Link>
      </div>

      {/* Main 2-col Pinterest layout — fits viewport */}
      <div className="px-3 md:px-6 lg:px-10 pb-6">
        <div
          className="grid grid-cols-1 lg:grid-cols-[1fr_400px] rounded-xl lg:rounded-2xl overflow-hidden shadow-[0_4px_28px_rgba(0,0,0,0.11)] bg-white min-h-[500px] lg:h-[calc(100vh-6rem)]"
        >

          {/* ── Left: media ── */}
          <div className="bg-[#111] flex items-center justify-center min-h-[320px] lg:h-full overflow-hidden">
            {isCarousel && post.media_items && (
              <MediaCarousel items={post.media_items} title={post.title ?? undefined} />
            )}
            {isEmbed && (
              <div className="w-full">
                <EmbedRenderer
                  platform={post.source_platform}
                  sourceUrl={post.source_url}
                  embedUrl={post.embed_url}
                  thumbnailUrl={displayThumbnail ?? undefined}
                />
              </div>
            )}
            {isVideoUpload && post.file_url && (
              <VideoPlayer src={post.file_url} poster={post.thumbnail_url} />
            )}
            {isImage && displayThumbnail && (
              <Image
                src={displayThumbnail}
                alt={post.title ?? 'Post image'}
                width={900}
                height={1200}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            )}
            {isPdf && post.file_url && (
              <iframe
                src={post.file_url}
                title={post.title ?? 'PDF'}
                className="w-full h-full min-h-[500px]"
              />
            )}
            {!hasMedia && displayThumbnail && (
              <a
                href={post.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block w-full group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={displayThumbnail} alt={post.title ?? 'Preview'} className="w-full h-auto" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 bg-white/90 rounded-full px-4 py-2 text-sm font-medium text-[#0A0A0A]">
                    <ExternalLink size={14} /> Open original
                  </div>
                </div>
              </a>
            )}
          </div>

          {/* ── Right: info panel ── */}
          <div className="flex flex-col bg-white overflow-y-auto lg:h-full">
            <div className="px-5 pt-5 pb-6 flex flex-col gap-5 flex-1">
              {/* Creator */}
              {post.user && (
                <Link
                  href={`/u/${post.user.username}`}
                  className="inline-flex items-center gap-2.5 hover:opacity-80 transition-opacity"
                >
                  <Avatar src={post.user.avatar_url} name={post.user.display_name} size="sm" />
                  <div>
                    <p className="text-sm font-semibold text-[#0A0A0A]">{post.user.display_name}</p>
                    <p className="text-xs text-[#6B7280]">{formatDate(post.created_at)}</p>
                  </div>
                </Link>
              )}

              {/* Title + description */}
              <div>
                {post.title && (
                  <h1 className="text-xl font-bold text-[#0A0A0A] leading-snug">{post.title}</h1>
                )}
                {post.description && (
                  <p className="text-sm text-[#6B7280] mt-2 leading-relaxed">{post.description}</p>
                )}
              </div>

              {/* Source */}
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-0.5 bg-[#EEF1F3] text-[#536878] rounded-full font-medium">
                  {platformName(post.source_platform)}
                </span>
                <a
                  href={post.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#6B7280] hover:text-[#536878] transition-colors"
                >
                  <ExternalLink size={11} />
                  View original
                </a>
              </div>

              {/* Tags */}
              {(post.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {[...new Set(post.tags)].map((tag) => (
                    <Link key={tag} href={`/tag/${encodeURIComponent(tag)}`}>
                      <Badge className="hover:opacity-80 transition-opacity cursor-pointer">#{tag}</Badge>
                    </Link>
                  ))}
                </div>
              )}

              {/* Saved in */}
              <PostSavedIn postId={post.id} />

              {/* Like / save / copy / delete — above comments */}
              <PostActions post={post} />

              {/* Comments — chat style */}
              <CommentThread postId={post.id} comments={post.comments} />
            </div>
          </div>
        </div>
      </div>

      {/* More like this */}
      {(post.related_posts ?? []).length > 0 && (
        <div className="px-3 md:px-6 lg:px-10 pb-12 pt-2">
          <h2 className="text-lg font-bold text-[#0A0A0A] mb-5">More like this</h2>
          <MasonryGrid posts={(post.related_posts ?? []).slice(0, 10)} />
        </div>
      )}
    </div>
  )
}

export default async function PostPage({ params }: Props) {
  const { id } = await params
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <Spinner className="text-[#536878]" size="lg" />
        </div>
      }
    >
      <PostDetails id={id} />
    </Suspense>
  )
}
