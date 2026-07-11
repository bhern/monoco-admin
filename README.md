# monoCO Admin

Vue admin app for monoCO call and entry management.

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

## Vercel

Use the Vite preset.

```text
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Required public-safe environment variables:

```text
VITE_MONOCO_API_URL=https://monoco-api.ben-505.workers.dev
VITE_APP_ENV=production
```

Do not add Supabase service role keys, R2 credentials, Resend keys, or Cloudflare API tokens to this app.
