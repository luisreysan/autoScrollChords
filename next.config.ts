import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native bindings: keep out of the webpack bundle on serverless (Vercel).
  serverExternalPackages: ["@libsql/client"],
};

export default nextConfig;
