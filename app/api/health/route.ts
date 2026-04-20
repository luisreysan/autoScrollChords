import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Lightweight health check — no database. Use to verify the deployment serves Next.js routes.
 */
export async function GET() {
  const hasKvUrl = Boolean(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL);
  const hasKvToken = Boolean(process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN);

  return NextResponse.json({
    ok: true,
    service: "autoscrollchords",
    hasTursoUrl: Boolean(process.env.TURSO_DATABASE_URL),
    hasTursoToken: Boolean(process.env.TURSO_AUTH_TOKEN),
    hasKvUrl,
    hasKvToken,
  });
}
