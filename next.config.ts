import type { NextConfig } from "next";
import { BASE_PATH } from "@/constants/basePath";

const env = process.env.NEXT_PUBLIC_ENV;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Served alongside pg-dashboard (which owns "/app") on the same host, see
  // src/constants/basePath.ts. assetPrefix must match basePath so the /_next
  // bundles are requested from under it too.
  basePath: BASE_PATH,
  assetPrefix: BASE_PATH,
  // Pin the workspace root to this project folder. Without this, Turbopack
  // auto-detects the root by walking up looking for lockfiles and will pick
  // up any stray lockfile in an ancestor directory (e.g. one sitting
  // directly in the user's home/Desktop folder), which can point it at a
  // directory outside this project — and, on macOS, one the OS may refuse
  // to let the dev server read at all.
  turbopack: {
    root: __dirname,
  },
  transpilePackages: ["@payglocal_ui/flux-ui", "@payglocal_ui/lumen"],
  env: {
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    // Read by proxy.ts for the heartbeat check. Unset it falls back to the
    // request's own origin, which loops the call back through this app's /gcc
    // rewrite instead of addressing the backend directly.
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },

  async rewrites() {
    if (env) {
      // UAT has moved to pygcl.com; dev/test/prod stay on payglocal.in.
      const gccDomain = env === "uat" ? "pygcl.com" : "payglocal.in";
      const rules: { source: string; destination: string; basePath?: false }[] = [
        {
          source: "/gcc/:path*",
          destination: `https://gcc.${env}.${gccDomain}/gcc/:path*`,
          basePath: false,
        },
      ];
      if (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) {
        rules.push({
          source: "/__/auth/:path*",
          destination: `https://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}/__/auth/:path*`,
        });
      }
      return rules;
    }
    return [];
  },
};

export default nextConfig;
