# moodboard-api

FastAPI backend for [Moodboard](../README.md) — handles content ingestion, AI tagging, media processing, auth, real-time messaging, and background jobs.

---

## Stack

| Layer | Tech | Why |
|---|---|---|
| Framework | FastAPI 0.136 | Async-first, auto OpenAPI, fast |
| Runtime | Python 3.12 | Latest stable, `asyncio` native |
| ORM | SQLAlchemy 2.0 async | Type-safe, async queries |
| DB driver | asyncpg | Fastest PostgreSQL async driver |
| Database | Supabase (PostgreSQL) | Managed Postgres + row-level security |
| Auth | Supabase JWT + python-jose | Verifies tokens signed by Supabase |
| Storage | Supabase Storage | File uploads, CDN delivery |
| AI | Groq API (LLaMA 3.3 70B) | Fast inference, free tier, auto-tagging |
| Media | yt-dlp | Download from 1000+ platforms |
| Images | Pillow + blurhash | Resize, optimize, generate blur placeholders |
| Cache | Upstash Redis REST | Serverless-safe (no persistent connections) |
| Queue | Upstash QStash | HTTP-based job queue, works on Vercel |
| Real-time | WebSockets | Live notifications and messages |
| HTTP client | httpx | Async HTTP for external APIs |
| Validation | Pydantic v2 | Fast, strict schema validation |
| Server | Uvicorn | ASGI server for local dev |

---

## Project structure

```
moodboard-api/
├── app/
│   ├── main.py              # App factory, middleware, router registration
│   ├── core/
│   │   ├── config.py        # Pydantic Settings (reads .env)
│   │   ├── database.py      # SQLAlchemy async engine + session
│   │   ├── redis.py         # Upstash Redis client
│   │   ├── security.py      # JWT verification, JWKS cache
│   │   └── init_db.py       # DB initialization helpers
│   ├── routers/
│   │   ├── auth.py          # /api/v1/auth — login, logout, session
│   │   ├── posts.py         # /api/v1/posts — CRUD, save from URL
│   │   ├── collections.py   # /api/v1/collections — boards, visibility
│   │   ├── users.py         # /api/v1/users — profiles, follow
│   │   ├── media.py         # /api/v1/media — file uploads
│   │   ├── search.py        # /api/v1/search — full-text + tags
│   │   ├── feed.py          # /api/v1/feed — home, trending, explore
│   │   ├── ai.py            # /api/v1/ai — tagging, suggestions
│   │   ├── messages.py      # /api/v1/messages — DMs + WebSocket
│   │   ├── notifications.py # /api/v1/notifications — real-time
│   │   ├── workers.py       # /api/v1/workers — QStash job handlers
│   │   └── seo.py           # /api/v1/seo — public sitemap data
│   ├── services/
│   │   ├── fetcher.py       # URL metadata + OG tag scraping
│   │   ├── ytdlp.py         # yt-dlp wrapper for media download
│   │   ├── groq.py          # Groq AI client, tag generation
│   │   ├── storage.py       # Supabase Storage upload/delete
│   │   ├── blurhash.py      # Image blur hash generation
│   │   ├── search.py        # Search indexing helpers
│   │   └── feed.py          # Feed ranking/scoring logic
│   ├── models/              # SQLAlchemy ORM models
│   └── schemas/             # Pydantic request/response schemas
├── requirements.txt
├── vercel.json              # Vercel Python serverless config
└── .env.example
```

---

## Environment variables

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

| Variable | Required | Where to get it |
|---|---|---|
| `DATABASE_URL` | Yes | Supabase → Settings → Database → Connection string |
| `SUPABASE_URL` | Yes | Supabase → Settings → API → Project URL |
| `SUPABASE_JWT_SECRET` | Yes | Supabase → Settings → API → JWT Settings → JWT Secret |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase → Settings → API → service_role key |
| `GROQ_API_KEY` | Yes | [console.groq.com](https://console.groq.com) — free, no card |
| `UPSTASH_REDIS_REST_URL` | Yes | [console.upstash.com](https://console.upstash.com) → Redis → REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash → Redis → REST Token |
| `QSTASH_TOKEN` | Yes | Upstash → QStash → Token |
| `QSTASH_CURRENT_SIGNING_KEY` | Yes | Upstash → QStash → Signing Keys |
| `QSTASH_NEXT_SIGNING_KEY` | Yes | Upstash → QStash → Signing Keys |
| `ENVIRONMENT` | Yes | `development` or `production` |
| `INSTAGRAM_ACCESS_TOKEN` | No | Meta for Developers — falls back to OG scraping |

> `SUPABASE_SERVICE_KEY` is a backend-only secret. Never expose it to the browser or commit it.

---

## Local development

```bash
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # fill in values
uvicorn app.main:app --reload --port 8000
```

- Swagger UI: `http://localhost:8000/api/docs`
- ReDoc: `http://localhost:8000/api/redoc`
- Health check: `http://localhost:8000/api/health`

---

## Deployment (Vercel)

`vercel.json` is already configured for Python serverless:

```json
{
  "builds": [{ "src": "app/main.py", "use": "@vercel/python" }],
  "routes": [{ "src": "/(.*)", "dest": "app/main.py" }]
}
```

**Steps:**

1. Create new Vercel project → import the monorepo
2. Set **Root Directory** to `moodboard-api`
3. Framework preset → **Other**
4. Add all env vars in Vercel dashboard
5. Deploy

> Vercel Python serverless has a 250MB limit and 10s execution timeout on hobby plan. yt-dlp downloads are handled via QStash background jobs to stay within limits.

---

## Key design decisions

**Upstash Redis over standard Redis** — Vercel serverless functions can't hold persistent TCP connections. Upstash's REST API works per-request with no connection overhead.

**QStash for background jobs** — media processing (yt-dlp downloads, thumbnail generation, AI tagging) is offloaded to QStash so API responses stay fast. Workers receive signed HTTP callbacks.

**Supabase JWT verification** — the API verifies tokens locally using cached JWKS keys (pre-fetched on startup), so auth adds <1ms per request.

**blurhash on upload** — every image gets a blur hash computed server-side at upload time. Frontend shows a smooth placeholder while the real image loads.

---

## License

GNU GPL-3.0 — see [LICENSE](../LICENSE).
