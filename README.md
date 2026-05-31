# Moodboard

**Visual content curation platform.** Save anything from YouTube, TikTok, Instagram, Spotify, Behance, Reddit — or any URL on the internet. Every save is AI-tagged, full-text searchable, and privately yours by default.

**Live → [moodboard-web-aryansrao.vercel.app](https://moodboard-web-aryansrao.vercel.app)**  
**API → [moodboard-api-aryansrao.vercel.app](https://moodboard-api-aryansrao.vercel.app/api/docs)**  
**Built by → [Aryan S Rao](https://aryansrao.vercel.app)**

---

## Architecture

```
moodboard/
├── moodboard-api/     # FastAPI — Python async REST API + WebSocket
└── moodboard-web/     # Next.js 16 App Router — React 19, TypeScript
```

**Infrastructure:** Neon (PostgreSQL 17) · Supabase (auth + storage) · Upstash Redis + QStash · Groq AI · Vercel (serverless, both projects)

---

## Tech stack

### Backend
| | |
|---|---|
| **FastAPI 0.136** | Async-first Python API framework, auto OpenAPI |
| **SQLAlchemy 2.0 async + asyncpg** | Fully async ORM against Neon PostgreSQL 17 |
| **Neon PostgreSQL** | Serverless Postgres — `tsvector` FTS, `pg_trgm` fuzzy search, `pgvector` for future visual similarity |
| **Supabase** | Auth (JWT/JWKS) + object storage — no separate auth service needed |
| **Groq API (LLaMA 3.3 70B)** | Sub-200ms AI inference for auto-tagging every saved post |
| **yt-dlp** | Media extraction from 1000+ platforms — YouTube, Instagram, TikTok, Spotify |
| **Upstash Redis REST** | Serverless-safe rate limiting and caching — no persistent TCP connections |
| **Upstash QStash** | HTTP job queue — offloads heavy media processing so API stays fast |
| **Pillow + blurhash** | Server-side image processing and blur hash generation on every upload |
| **python-jose** | JWKS-cached JWT verification — auth adds <1ms per request |
| **WebSockets** | Real-time DMs and notification delivery |
| **Pydantic v2** | Fast, strict schema validation throughout |

### Frontend
| | |
|---|---|
| **Next.js 16.2 App Router** | RSC streaming, file-based routing, layout segments |
| **React 19** | Concurrent rendering, `use()` hook, optimistic UI |
| **TypeScript 5.8** | Strict end-to-end types across all components and API calls |
| **Tailwind CSS v4** | CSS-first config (no JS config file), JIT, custom design tokens |
| **TanStack React Query v5** | Fine-grained server state — deduplication, background refetch, optimistic mutations |
| **Zustand v5** | Minimal global state for auth session and UI |
| **Supabase SSR** | Cookie-based session management, SSR-safe client |
| **React Intersection Observer** | GSAP-style scroll reveals using CSS `opacity + blur + translateY` — no animation library |
| **React Masonry CSS** | Pinterest-style variable-height grid, responsive breakpoints |
| **React Blurhash** | Smooth blur-to-image transitions using server-generated hash |
| **PDF.js** | In-browser PDF thumbnail rendering without server round-trip |
| **@vercel/og** | Node.js-runtime OG image generation — reads actual logo from filesystem |

---

## Performance engineering

**Zero cold starts.** Both Vercel deployments stay warm. Neon serverless eliminates idle compute cost without the startup penalty of containerized databases.

**Sub-200ms AI tagging.** Groq's inference API consistently returns LLaMA 3.3 70B completions faster than GPT-4 at a fraction of the cost — free tier covers all dev traffic.

**Async throughout.** Every database query, HTTP call, and storage operation in the FastAPI backend is `async`/`await`. asyncpg is the fastest PostgreSQL driver available for Python — no thread-pool blocking.

**Background job offload.** Heavy operations (yt-dlp downloads, AI inference, thumbnail generation, blurhash computation) are enqueued to Upstash QStash. The API responds in <100ms while work happens asynchronously. Signed HMAC callbacks prevent replay attacks on worker endpoints.

**Serverless-native caching.** Upstash Redis REST API is used instead of standard Redis — Vercel serverless functions can't hold persistent TCP connections. Per-request HTTP calls with exponential backoff.

**Progressive image loading.** Every uploaded image gets a `blurhash` computed server-side. The frontend renders a smooth placeholder at paint time, replaced by the real image as it loads.

**Optimistic UI.** React Query mutations update the cache immediately before the server round-trip completes — likes, saves, and collection moves feel instant.

---

## Search architecture

No external search service. PostgreSQL 17 does it all:

- **`tsvector` + `GIN` index** — full-text search across post titles, descriptions, and AI-generated captions. Sub-10ms on a 100k row dataset.
- **`pg_trgm` + `GiST` index** — fuzzy/typo-tolerant matching. Finds "inspiratn" → "inspiration" without configuration.
- **`pgvector`** — vector column on posts for future visual similarity search. Index is built, ready to populate from image embeddings.

Combined query hits all three in a single SQL statement, ranked by relevance.

---

## SEO & web fundamentals

- **Static metadata + dynamic OG images** — every public post and user profile generates its own OpenGraph image at request time via `@vercel/og` (Node.js runtime, reads real logo from filesystem)
- **Canonical URLs** — correct `alternates.canonical` on every page with a public URL
- **XML sitemaps** — dynamic sitemap for posts and collections, revalidated hourly via `next/server` route handlers
- **`robots.txt`** — fine-grained crawl control; auth and private routes excluded
- **JSON-LD `Organization` schema** — structured data for search engines
- **PWA** — full web app manifest, service worker, maskable icons, Apple touch icon, theme-color meta
- **Core Web Vitals** — Tailwind v4 ships zero runtime CSS-in-JS; no layout shift from dynamic styles. Blurhash prevents CLS from image loading. Font subsets via `next/font`.

---

## API surface

All routes under `/api/v1`. Interactive docs at `/api/docs`.

| Router | Responsibility |
|---|---|
| `auth` | Session management, token exchange |
| `posts` | CRUD, URL ingestion, file upload |
| `collections` | Boards, visibility, slug routing |
| `users` | Profiles, follow graph, public boards |
| `media` | Image/video/PDF upload, processing |
| `search` | FTS + fuzzy + combined ranked query |
| `feed` | Home, trending, explore, tag browse |
| `ai` | Tag regeneration, AI suggestions |
| `messages` | DMs, WebSocket connection management |
| `notifications` | Real-time delivery + read state |
| `workers` | QStash job handlers (signed callbacks) |
| `seo` | Public sitemap data, crawlable endpoints |

---

## Open source

Licensed under the **GNU General Public License v3.0** — free to use, modify, and distribute. Derivative works must remain GPL-3. Commercial use is allowed but source must stay open.

See [LICENSE](./LICENSE).

---

*Built by [Aryan S Rao](https://aryansrao.vercel.app) · [Live app](https://moodboard-web-aryansrao.vercel.app) · [API docs](https://moodboard-api-aryansrao.vercel.app/api/docs)*
