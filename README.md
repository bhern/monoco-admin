# monoCO Admin

Vue admin app for monoCO call and entry management, deployed with Cloudflare Workers Static Assets.

Framer remains the public facade. This app is the admin surface for workflows that need app state, authenticated Worker calls, uploads, review tools, and future dashboard depth.

## Stack

- Vue 3
- TypeScript
- Vite
- Vue Router
- Pinia
- lucide-vue-next

## Local Setup

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` when running locally.

## Cloudflare

The production deployment is a static-assets-only Worker. Vue Router history fallback is configured in `wrangler.jsonc`.

```bash
npm run deploy:dry-run
npm run deploy
```

Cloudflare Workers Builds can connect to the GitHub repository for automatic deployments:

```text
Production branch: main
Build command: npm run build
Deploy command: npx wrangler deploy
```

The production API URL already has a public-safe fallback in the frontend. Local overrides can be supplied through the variables documented in `.env.example`.

Do not add Supabase service role keys, R2 credentials, Resend keys, or Cloudflare API tokens to this app or its build configuration.

## Current Scope

- list calls
- create/edit Monthly Challenge calls
- set call status, including publishing/opening a call
- manage call copy, timing, rules, and constraints
- manage call categories
- upload call hero/category assets through the Worker
- review entries
- approve/reject entries so approved images can appear in the public gallery

Feature Submissions are not part of this app yet. They remain in the existing Feature Submission workflow until Monthly Challenge is stable.

## Architecture Rule

The admin app should stay thin:

- browser UI in Vue
- all privileged operations through the Cloudflare Worker
- database state in Supabase
- files in R2
- emails through Worker/Resend

No direct Supabase admin writes from the frontend.
