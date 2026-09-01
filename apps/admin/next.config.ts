import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(appDir, "../..");

loadEnvConfig(repoRoot, undefined, undefined, true);
// 🔴 Keep what the root load produced. @next/env restores process.env to its
// pre-load state before applying a new directory, so the appDir call below
// DISCARDS every value the root .env.local supplied. Without this, an app whose
// own .env.local does not repeat them boots with NEXT_PUBLIC_SUPABASE_URL and
// friends unset — and the failure surfaces far away, as "supabase not
// configured" on a login page rather than as a missing env var.
const fromRoot = { ...process.env };

loadEnvConfig(appDir, undefined, undefined, true);

// App-level wins; root fills the gaps. A key the app set — even to "" — is left
// alone, so an app can still deliberately blank a root value.
for (const [key, value] of Object.entries(fromRoot)) {
  if (process.env[key] === undefined && value !== undefined) {
    process.env[key] = value;
  }
}

const nextConfig: NextConfig = {
  outputFileTracingRoot: repoRoot,
  transpilePackages: [
    "@pakfactory/ui",
    "@pakfactory/auth-ui",
    "@pakfactory/brief-builder-ui",
    "@pakfactory/supabase",
  ],
  turbopack: {
    resolveAlias: {
      "@pakfactory/ui/globals.css": join(repoRoot, "packages/ui/src/globals.css"),
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
