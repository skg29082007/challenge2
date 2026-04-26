# ElectEd

A beautiful, fully responsive single-page election education website built for the **PromptWars Virtual** hackathon.

Judged on: Code Quality, Security, Efficiency, Testing, Accessibility, Google Services.

## Features

- **Hero** with a clear call-to-action
- **6-phase election timeline** with scroll reveal animations
- **10-question interactive quiz** with instant scoring & explanations
- **AI Assistant** powered by Google Gemini (`gemini-2.5-flash`) — answers nonpartisan election questions
- **22-term glossary** with live search & filtering
- **World stats** with animated bar chart and donut chart
- Sticky responsive navbar, mobile menu, accessible footer

## Tech Stack

- **Frontend**: pure HTML / CSS / vanilla JS (single `index.html`) served by Vite
- **Backend**: Express (`@workspace/api-server`) exposing `POST /api/chat`, which proxies messages to Google Gemini via the Replit AI Integrations service — **no API key is exposed to the browser**
- **Monorepo**: pnpm workspaces, TypeScript

## Security & Accessibility

- Strict Content Security Policy via `<meta>` tag
- WCAG 2.1 AA: skip link, visible focus rings, semantic landmarks, `prefers-reduced-motion` support
- Zod input validation on the chat endpoint, 2000-char user input cap
- Gemini API key kept server-side via Replit's AI Integrations proxy

## Project Structure

```
artifacts/
  elected/         # Single-file static site (index.html)
  api-server/      # Express + Gemini chat proxy (POST /api/chat)
  mockup-sandbox/  # Vite preview server for component variants
lib/
  integrations-gemini-ai/   # Gemini client wrapper
```

## Running locally

```bash
pnpm install
pnpm --filter @workspace/api-server run dev   # backend
pnpm --filter @workspace/elected     run dev  # frontend
```

Built on Replit.
