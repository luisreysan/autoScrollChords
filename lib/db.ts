import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "@/db/schema";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof drizzle<typeof schema>> | undefined;
  client: ReturnType<typeof createClient> | undefined;
};

export function getDb() {
  if (globalForDb.db) {
    return globalForDb.db;
  }

  const url = requireEnv("TURSO_DATABASE_URL");
  const authToken = process.env.TURSO_AUTH_TOKEN;

  const client = createClient({
    url,
    authToken: authToken || undefined,
  });

  const db = drizzle(client, { schema });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.client = client;
    globalForDb.db = db;
  }

  return db;
}

export { schema };
