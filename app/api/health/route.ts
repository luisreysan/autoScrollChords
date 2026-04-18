import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Lightweight health check — no database. Use to verify the deployment serves Next.js routes.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "autoscrollchords",
    hasTursoUrl: Boolean(process.env.TURSO_DATABASE_URL),
    hasTursoToken: Boolean(process.env.TURSO_AUTH_TOKEN),
    hasKvUrl: Boolean(process.env.KV_REST_API_URL),
    hasKvToken: Boolean(process.env.KV_REST_API_TOKEN),
  });
}
