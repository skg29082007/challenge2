# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Artifacts

- **ElectEd** (`artifacts/elected`, served at `/`): Single-page interactive election education website built for the PromptWars Virtual hackathon. Pure HTML/CSS/vanilla JS in `index.html` (no React). Sections: hero, 6-phase timeline, 10-question quiz, **YouTube civic-education videos** (CGP Grey via youtube-nocookie), AI assistant chat, searchable glossary with **"Explain with AI"** button on every term, animated world stats (counters + bars + donut), footer. Uses Google Fonts (Playfair Display + Inter) and Google Material Symbols icons.
- **API Server** (`artifacts/api-server`, served at `/api`): Express server with three endpoints — `POST /api/chat` (standard JSON), `POST /api/chat/stream` (SSE streaming via Gemini's `generateContentStream`), and `POST /api/glossary/explain` (kid-friendly term explainer). Uses helmet, compression, pino-http, Zod validation, 100kb body limit. AI calls go through `@workspace/integrations-gemini-ai` (Replit AI Integrations proxy — no API key in frontend). Vitest + Supertest test suite (24 tests) in `src/__tests__/` covering health, chat, streaming, glossary, validation, and error paths.

## GitHub

- The full project is mirrored to https://github.com/skg29082007/challenge2 (main branch). Pushed via the GitHub REST API since the git CLI is system-blocked in this environment. Token stored as `GITHUB_TOKEN` secret. To re-push: walk files, inline text content into a single tree call (use `/git/blobs` only for binaries to avoid rate limits), create commit with `parents: [parentSha]`, then `PATCH /git/refs/heads/main` with `force: true`. Keep API concurrency low (~6) to avoid secondary rate limits.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
