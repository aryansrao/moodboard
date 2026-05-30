import type { NextRequest } from 'next/server'
import { api } from '@/lib/api'

export const revalidate = 3600 // 1 hour

interface Params {
  params: Promise<{ type: string }>
}

function xmlEscape(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildSitemap(urls: Array<{ loc: string; lastmod?: string; priority?: number }>): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const entries = urls
    .map(
      ({ loc, lastmod, priority }) => `
  <url>
    <loc>${xmlEscape(`${baseUrl}${loc}`)}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    ${priority !== undefined ? `<priority>${priority}</priority>` : ''}
  </url>`
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`
}

export async function GET(request: NextRequest, { params }: Params) {
  const { type } = await params

  try {
    let xml = ''

    if (type === 'posts') {
      const { posts } = await api.feed.trending()
      xml = buildSitemap(
        posts.map((p) => ({
          loc: `/post/${p.id}`,
          lastmod: p.updated_at.split('T')[0],
          priority: 0.8,
        }))
      )
    } else if (type === 'collections') {
      const collections = await api.collections.list()
      xml = buildSitemap(
        collections
          .filter((c) => c.visibility === 'public')
          .map((c) => ({
            loc: `/c/${c.slug}`,
            lastmod: c.updated_at.split('T')[0],
            priority: 0.7,
          }))
      )
    } else {
      // Index sitemap
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${baseUrl}/api/sitemap/posts</loc></sitemap>
  <sitemap><loc>${baseUrl}/api/sitemap/collections</loc></sitemap>
</sitemapindex>`
    }

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch {
    return new Response('Error generating sitemap', { status: 500 })
  }
}
