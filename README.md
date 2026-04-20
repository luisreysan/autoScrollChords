# AutoScroll Chords

Mobile-first web app to view guitar chord sheets with local auto-scroll, Ultimate Guitar import, and Turso (SQLite) storage.

## Setup

1. Copy `.env.template` to `.env.local` and fill in Turso credentials.
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


| Script                | Description               |
| --------------------- | ------------------------- |
| `npm run dev`         | Start Next.js (Turbopack) |
| `npm run build`       | Production build          |
| `npm run db:push`     | Push Drizzle schema to DB |
| `npm run db:generate` | Generate SQL migrations   |
| `npm run db:studio`   | Drizzle Studio            |


## Deployment (Vercel)

Set the same environment variables in the Vercel project. API routes that scrape Ultimate Guitar use the **Node.js** runtime (`export const runtime = "nodejs"`).

Required env vars in production:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `EXTENSION_IMPORT_TOKEN` (required if you use the Chrome extension importer)

### If you see `404: NOT_FOUND` (plain Vercel page)

Work through this in order:

1. **Diagnostics URL (no database required)**
   Open `https://YOUR_PROJECT.vercel.app/api/health` (use your real deployment domain).  
   - **If this is also 404**: the deployment is not running Next.js correctly. Fix project settings (below) and redeploy — the app code is not being served.  
   - **If you get JSON** with `"ok": true`: routing works; continue with env vars / Turso if `/` shows an error banner.
2. **Project → Settings → General → Framework Preset** must be **Next.js**, not “Other” or a static preset.
3. **Project → Settings → Build & Development → Output Directory** must be **empty** for Next.js. Do not set it to `.next` or `out` unless you really know you need it; wrong values often produce a global 404.
4. **Root Directory** should be **empty** (repo root) unless the app lives in a subfolder.
5. Open the URL from the latest **successful** deployment on the **Deployments** tab (avoid old preview URLs with a long hash if that deployment was removed).
6. After changing framework or output settings, trigger a **Redeploy** (optionally “Clear cache and redeploy”).
7. If it still fails, **create a new Vercel project** from the same Git repo (Framework: Next.js, root empty, output empty) so no stale overrides remain.

### If `/` loads but you see a “Database not available” banner

Add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` (if your Turso database requires it) under **Environment Variables** for **Production**, then **redeploy**. From your machine, run `npm run db:push` with the same URL/token so the `songs` / `song_contents` tables exist.

The `GET /api/health` response includes safe booleans (`hasTursoUrl`, `hasExtensionImportToken`, etc.) so you can confirm variables are visible to the deployment without pasting secrets.

## Chrome Extension Import (V1)

This repository includes a Chrome MV3 extension under `extension/` that exports the currently open Ultimate Guitar song to your app.

### Backend requirements

1. Set `EXTENSION_IMPORT_TOKEN` in your app env vars.
2. Use endpoint: `POST /api/songs/import-extension`
3. Send header: `x-extension-token: <EXTENSION_IMPORT_TOKEN>`

### Load extension locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `extension/` folder from this repo.

### Configure extension

Open the extension options page and set:

- `API Base URL` (example: `https://your-app.vercel.app`)
- `Extension Import Token` (must match backend env var)

### Use extension

1. Open any Ultimate Guitar tab page (`/tab/...` URL).
2. Click the extension icon.
3. Click **Export current song**.
4. The popup reports whether the song was imported or already exists.

## Tech stack

- Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- Drizzle ORM + Turso (`@libsql/client`)
- Cheerio for server-side parsing

