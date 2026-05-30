import type { Metadata } from 'next'
import { Inter, Inter_Tight } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'
import { ToastContainer } from '@/components/ui/Toast'
import { AuthProvider } from './providers'
import { ServiceWorker } from '@/components/layout/ServiceWorker'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-inter-tight',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Moodboard — Save anything from anywhere. Free forever.',
    template: '%s | Moodboard',
  },
  description:
    'Moodboard is the free, open internet scrapbook. Save YouTube videos, Instagram reels, TikToks, articles, designs, and your own photos — AI-tagged, beautifully organized, searchable in milliseconds.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  openGraph: { type: 'website', siteName: 'Moodboard' },
  twitter: { card: 'summary_large_image' },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Moodboard',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#536878',
    'theme-color': '#536878',
  },
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Moodboard',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  description: 'Free visual content curation platform. Save YouTube videos, Instagram reels, TikToks, articles, and your own photos — AI-tagged, beautifully organized.',
  sameAs: [],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${interTight.variable}`}>
      <body className="antialiased overflow-x-hidden">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <AuthProvider>
          {children}
          <ToastContainer />
          <Analytics />
          <ServiceWorker />
        </AuthProvider>
      </body>
    </html>
  )
}
