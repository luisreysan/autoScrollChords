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

### If you see `404: NOT_FOUND` (plain Vercel page)

Work through this in order:

1. **Diagnostics URL (no database required)**  
   Open **`https://YOUR_PROJECT.vercel.app/api/health`** (use your real deployment domain).  
   - **If this is also 404**: the deployment is not running Next.js correctly. Fix project settings (below) and redeploy — the app code is not being served.  
   - **If you get JSON** with `"ok": true`: routing works; continue with env vars / Turso if `/` shows an error banner.

2. **Project → Settings → General → Framework Preset** must be **Next.js**, not “Other” or a static preset.

3. **Project → Settings → Build & Development → Output Directory** must be **empty** for Next.js. Do not set it to `.next` or `out` unless you really know you need it; wrong values often produce a global 404.

4. **Root Directory** should be **empty** (repo root) unless the app lives in a subfolder.

5. Open the URL from the latest **successful** deployment on the **Deployments** tab (avoid old preview URLs with a long hash if that deployment was removed).

6. After changing framework or output settings, trigger a **Redeploy** (optionally “Clear cache and redeploy”).

7. If it still fails, **create a new Vercel project** from the same Git repo (Framework: Next.js, root empty, output empty) so no stale overrides remain.

### If `/` loads but you see a “Database not available” banner

Add **`TURSO_DATABASE_URL`** and **`TURSO_AUTH_TOKEN`** (if your Turso database requires it) under **Environment Variables** for **Production**, then **redeploy**. From your machine, run **`npm run db:push`** with the same URL/token so the `songs` / `song_contents` tables exist.

The **`GET /api/health`** response includes safe booleans (`hasTursoUrl`, etc.) so you can confirm variables are visible to the deployment without pasting secrets.

## Tech stack

- Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui  
- Drizzle ORM + Turso (`@libsql/client`)  
- Cheerio for server-side parsing  
- `@vercel/kv` for scroll session storage  
