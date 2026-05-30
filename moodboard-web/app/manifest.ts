import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Moodboard',
    short_name: 'Moodboard',
    description: 'Save anything from anywhere. Free forever.',
    start_url: '/home',
    display: 'standalone',
    background_color: '#FAFAFA',
    theme_color: '#536878',
    orientation: 'portrait-primary',
    categories: ['productivity', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/logo.png', sizes: 'any', type: 'image/png' },
    ],
    // Web Share Target — when user shares a URL/text from another app,
    // Moodboard appears as a share destination and opens /save with the params
    share_target: {
      action: '/save',
      method: 'GET',
      params: {
        title: 'title',
        text: 'text',
        url: 'url',
      },
    },
    screenshots: [
      {
        src: '/og-screenshot.png',
        sizes: '1200x630',
          form_factor: 'wide',
      },
    ],
  }
}
