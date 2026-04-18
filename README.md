# AutoScroll Chords

Mobile-first web app to view guitar chord sheets with auto-scroll, Ultimate Guitar import, Turso (SQLite) storage, and optional multi-device scroll sync via Vercel KV.

## Setup

1. Copy `.env.template` to `.env.local` and fill in Turso and KV credentials.

2. Apply the database schema to your Turso database:

```bash
npm run db:push
```

Alternatively, use generated SQL under `drizzle/` with your preferred migration workflow.

3. Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script            | Description                |
| ----------------- | -------------------------- |
| `npm run dev`     | Start Next.js (Turbopack)  |
| `npm run build`   | Production build           |
| `npm run db:push` | Push Drizzle schema to DB  |
| `npm run db:generate` | Generate SQL migrations |
| `npm run db:studio`   | Drizzle Studio          |

## Deployment (Vercel)

Set the same environment variables in the Vercel project. API routes that scrape Ultimate Guitar use the **Node.js** runtime (`export const runtime = "nodejs"`).

## Tech stack

- Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui  
- Drizzle ORM + Turso (`@libsql/client`)  
- Cheerio for server-side parsing  
- `@vercel/kv` for scroll session storage  
