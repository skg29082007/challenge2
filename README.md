# ElectEd · Understand How Elections Work

An interactive, AI-powered education site that explains how elections work — built for **PromptWars Virtual 2025**.

🌐 **Repo:** https://github.com/skg29082007/challenge2

---

## What's inside

| Section | Description |
|---|---|
| **Hero** | Animated landing with key stats (6 phases, 22 terms, 10 questions). |
| **Timeline** | Six-phase election walkthrough with a vertical timeline. |
| **Civic Quiz** | Ten-question quiz with explanations and a final score. |
| **Watch & Learn** | Curated YouTube videos (CGP Grey) embedded via youtube-nocookie. |
| **AI Assistant** | Chat with **Google Gemini** for plain-language answers about voting. |
| **Glossary** | Searchable, filterable glossary of 22 election terms. Each term has an **"Explain with AI"** button that calls Gemini for a kid-friendly explanation. |
| **World Stats** | Animated counters, regional turnout bars, and a methods donut chart. |

## Google Services used

- **Google Gemini** — Both the chat assistant (`/api/chat`, `/api/chat/stream`) and the on-demand glossary explainer (`/api/glossary/explain`) are powered by Gemini via the Replit AI Integrations proxy.
- **Google Fonts** — Playfair Display + Inter for the typography system.
- **Google Material Symbols** — Iconography for the AI features and video badges.
- **YouTube** — Civic-education videos embedded via `youtube-nocookie.com` for privacy.

## Tech stack

- **Frontend:** Single-file vanilla HTML / CSS / JS (`artifacts/elected/index.html`) — zero framework, fast first paint, accessible.
- **Backend:** Express + TypeScript (`artifacts/api-server/`) with `pino-http` logging, `helmet`, `compression`, and Zod request validation.
- **AI:** `@google/genai` via Replit's Gemini AI integration proxy.
- **Tests:** Vitest + Supertest (48 tests covering health, chat, streaming, glossary explain, validation, security headers, rate limiting, error handling, and CORS).
- **Monorepo:** pnpm workspace with shared TS configs and project references.

## Security & quality

**API server (`artifacts/api-server`):**
- **Helmet** sets HSTS (1y), Cross-Origin-Resource-Policy, Cross-Origin-Opener-Policy, Referrer-Policy, X-Content-Type-Options, X-Frame-Options: DENY.
- **Permissions-Policy** disables geolocation, camera, microphone, payment, USB, magnetometer.
- **express-rate-limit** — 30 req/min per IP for chat/explain, 10 req/min for streaming. Honors `X-Forwarded-For` behind Replit's proxy.
- **Zod with `.strict()`** rejects unknown fields, enforces min/max bounds.
- **Custom error classes** (`AppError`, `ValidationError`, `UpstreamError`) → centralized error middleware emits consistent `{ error, code, details? }` JSON. Stack traces never leak in production.
- **Request-ID middleware** assigns/forwards `X-Request-Id` for log correlation.
- 100 KB JSON body limit (returns structured 413), `x-powered-by` disabled, response compression (skips SSE), CORS preflight handled.

**Static site (`artifacts/elected`):**
- **CSP delivered as a real HTTP header** via a custom Vite plugin (`vite-security-headers.ts`), not a `<meta>` tag — so `frame-ancestors`, `form-action`, `object-src 'none'`, and `upgrade-insecure-requests` actually take effect.
- HSTS, X-Content-Type-Options: nosniff, Referrer-Policy, Permissions-Policy on every response.
- WCAG 2.1 AA: skip-to-content link, ARIA live regions, keyboard-trappable modal with focus restore, `prefers-reduced-motion` respected, high-contrast palette, semantic landmarks.
- No third-party trackers; YouTube uses `youtube-nocookie.com`.

**Test coverage (Vitest + Supertest, 48 tests):**
- Health checks, chat happy-path, role mapping, system prompt, streaming SSE, glossary explain.
- Strict-mode schema validation (extra-field rejection, length bounds).
- Security headers, request-ID echoing, oversized payload (413), 404 shape, CORS preflight.
- Error path coverage for AI service failures (502 with `UPSTREAM_ERROR`).

## Local development

```bash
pnpm install
pnpm --filter @workspace/elected run dev          # static site (port from $PORT)
pnpm --filter @workspace/api-server run dev       # API + Gemini proxy
pnpm --filter @workspace/api-server run test      # vitest suite
```

The site assumes the API server is reachable at the same origin (path-based routing handles this automatically in the Replit workspace).

## Project structure

```
artifacts/
├── elected/          # ElectEd single-page site (HTML + assets)
└── api-server/       # Express API: /api/chat, /api/chat/stream, /api/glossary/explain
    └── src/__tests__/    # Vitest test suite
```

---

Built with care for civic literacy.
