# moodboard-web

Next.js frontend for [Moodboard](../README.md) — the visual content curation app. Save from YouTube, Instagram, TikTok, Pinterest, Spotify, and more.

---

## Stack

| Layer | Tech | Why |
|---|---|---|
| Framework | Next.js 16.2 (App Router) | RSC, streaming, file-based routing |
| Language | TypeScript 5.8 | Strict types end-to-end |
| UI runtime | React 19 | Concurrent features, use() hook |
| Styling | Tailwind CSS v4 | CSS-first config, no JS config file |
| Auth | Supabase SSR (`@supabase/ssr`) | Cookie-based sessions, SSR-safe |
| Data fetching | TanStack React Query v5 | Cache, deduplication, optimistic updates |
| Client state | Zustand v5 | Minimal boilerplate global state |
| Icons | Lucide React | Tree-shakeable SVG icon set |
| Grid layout | React Masonry CSS | Pinterest-style variable-height grid |
| Image loading | React Blurhash | Smooth blur-to-image loading |
| PDF rendering | PDF.js (pdfjs-dist) | In-browser PDF thumbnails |
| Scroll effects | React Intersection Observer | GSAP-style reveal without GSAP |
| OG images | @vercel/og (Node.js runtime) | Dynamic opengraph images per post/user |
| Analytics | Vercel Analytics | Zero-config, privacy-friendly |

---

## Project structure

```
moodboard-web/
├── app/
│   ├── page.tsx                 # Landing page
│   ├── layout.tsx               # Root layout, metadata, fonts, providers
│   ├── globals.css              # Tailwind base + CSS variables
│   ├── manifest.ts              # PWA manifest
│   ├── sitemap.ts               # Static sitemap
│   ├── robots.ts                # robots.txt
│   ├── opengraph-image.tsx      # Default OG image (Node.js runtime)
│   ├── icon.png                 # Favicon (auto-served by Next.js)
│   ├── apple-icon.png           # Apple touch icon (auto-served)
│   ├── (auth)/                  # Auth routes (login, signup, callback)
│   ├── (app)/                   # Authenticated app shell
│   │   ├── home/                # Home feed
│   │   ├── explore/             # Discover / trending
│   │   ├── search/              # Search results
│   │   ├── post/[id]/           # Post detail (Pinterest layout)
│   │   ├── u/[username]/        # Public user profile
│   │   ├── c/[slug]/            # Public collection
│   │   ├── tag/[tag]/           # Tag browse
│   │   ├── messages/            # Direct messages
│   │   ├── notifications/       # Notifications
│   │   └── settings/            # Account settings
│   └── api/
│       ├── sitemap/[type]/      # Dynamic sitemap (posts, collections)
│       └── icons/               # PWA icon routes
├── components/
│   ├── layout/                  # TopBar, Sidebar, ServiceWorker
│   ├── feed/                    # MasonryGrid, PostCard, InfiniteScroll
│   ├── media/                   # EmbedRenderer, VideoPlayer, MediaCarousel
│   ├── social/                  # PostActions, CommentThread, PostSavedIn
│   ├── save/                    # SaveModal, URL input, upload flow
│   ├── ai/                      # AI tag suggestions
│   ├── messages/                # Chat UI components
│   ├── settings/                # Profile, account settings forms
│   └── ui/                      # Badge, Avatar, Spinner, Toast, RevealSection
├── lib/
│   ├── api.ts                   # Typed API client (wraps fetch → moodboard-api)
│   ├── utils.ts                 # formatDate, platformName, cn(), etc.
│   └── supabase/                # Supabase client factories (browser + server)
├── public/
│   ├── logo.png                 # App logo (used in TopBar, Sidebar, OG)
│   └── icons/                   # PWA icons (192px, 512px, 180px Apple)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── .env.example
```

---

## Environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Required | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase → Settings → API → anon/public key |
| `NEXT_PUBLIC_API_URL` | Yes | Your deployed `moodboard-api` URL (or `http://localhost:8000` locally) |
| `NEXT_PUBLIC_SITE_URL` | No | Your frontend domain — defaults to `http://localhost:3000` |

---

## Local development

```bash
npm install
cp .env.example .env.local    # fill in values
npm run dev
```

App runs at `http://localhost:3000`. Backend must also be running at `http://localhost:8000` (or update `NEXT_PUBLIC_API_URL`).

---

## Key components

### `RevealSection` (`components/ui/RevealSection.tsx`)
Scroll-triggered reveal with opacity + blur + translateY transition. Uses `react-intersection-observer` — no GSAP dependency needed.

```tsx
<RevealSection delay={200} blur y={32}>
  <YourContent />
</RevealSection>
```

### `MasonryGrid` (`components/feed/MasonryGrid.tsx`)
Pinterest-style variable-height grid using `react-masonry-css`. Responsive columns: 1 → 2 → 3 → 4 → 5.

### `EmbedRenderer` (`components/media/EmbedRenderer.tsx`)
Handles embed rendering for YouTube, Vimeo, TikTok, Spotify, Instagram, Pinterest — shows native embeds or falls back to thumbnail.

### `lib/api.ts`
Typed client wrapping all `moodboard-api` endpoints. All fetch calls go through here — handles auth headers, error parsing, and response typing.

---

## Deployment (Vercel)

Next.js auto-detected. No extra config needed beyond env vars.

1. Create new Vercel project → import the monorepo
2. Set **Root Directory** to `moodboard-web`
3. Framework → **Next.js** (auto-detected)
4. Add env vars in Vercel dashboard
5. Deploy

---

## PWA

Moodboard is a full PWA:
- `app/manifest.ts` — web app manifest with icons
- `components/layout/ServiceWorker.tsx` — registers service worker
- `public/icons/` — 192px, 512px (maskable), 180px Apple touch icons
- `app/icon.png` / `app/apple-icon.png` — auto-served by Next.js as favicon and apple-touch-icon

---

## License

GNU GPL-3.0 — see [LICENSE](../LICENSE).
