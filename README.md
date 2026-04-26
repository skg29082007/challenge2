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
- **Tests:** Vitest + Supertest (24 tests covering health, chat, streaming, glossary explain, validation, and error paths).
- **Monorepo:** pnpm workspace with shared TS configs and project references.

## Security & quality

- Strict Content Security Policy (`default-src 'self'`, `frame-src https://www.youtube-nocookie.com`).
- Helmet, response compression, 100 KB JSON body limit.
- Zod validation on every API endpoint with structured 400 responses.
- WCAG 2.1 AA: skip links, ARIA live regions, keyboard-navigable modal with focus restore, high-contrast palette.
- No third-party trackers, no cookies in YouTube embeds.

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
