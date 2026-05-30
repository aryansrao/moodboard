import { ImageResponse } from '@vercel/og'
import type { NextRequest } from 'next/server'
import { api } from '@/lib/api'

export const runtime = 'edge'

interface Params {
  params: Promise<{ slug: string[] }>
}

export async function GET(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const [type, id] = slug

  let title = 'Moodboard'
  let subtitle = 'Save everything that inspires you'
  let imageUrl: string | undefined

  try {
    if (type === 'post' && id) {
      const post = await api.posts.get(id)
      title = post.title ?? 'Untitled post'
      subtitle = post.tags.slice(0, 3).map((t) => `#${t}`).join('  ') || 'Moodboard post'
      imageUrl = post.thumbnail_url
    } else if (type === 'collection' && id) {
      const col = await api.collections.get(id)
      title = col.title
      subtitle = `${col.post_count} posts · ${col.follower_count} followers`
      imageUrl = col.cover_image_url
    } else if (type === 'user' && id) {
      const user = await api.users.profile(id)
      title = user.display_name
      subtitle = `@${user.username} · ${user.post_count} posts`
      imageUrl = user.avatar_url
    }
  } catch {
    // Use defaults
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FAFAFA',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Background image */}
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.15,
            }}
          />
        )}

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            height: '100%',
            padding: '48px',
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#536878',
                letterSpacing: '-0.02em',
              }}
            >
              Moodboard
            </div>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: '40px',
              fontWeight: 800,
              color: '#0A0A0A',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              maxWidth: '800px',
            }}
          >
            {title}
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: '18px',
              color: '#6B7280',
              marginTop: '12px',
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
