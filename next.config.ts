import type { NextConfig } from "next";
import path from "node:path";

const env = process.env.NEXT_PUBLIC_ENV;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // @payglocal_ui/lumen is a `file:../lumen` dependency, so npm symlinks it into
  // node_modules with a real path *outside* pg-dashboard-v2. Turbopack bounds module
  // resolution to its inferred project root (this folder, picked from the lockfile),
  // so the symlinked package fails to resolve ("Module not found"). Pointing the root
  // at the parent dir that contains both packages lets Turbopack follow the symlink.
  turbopack: {
    root: path.join(__dirname, ".."),
  },
  transpilePackages: ["@payglocal_ui/flux-ui", "@payglocal_ui/lumen"],
  env: {
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  },

  async rewrites() {
    if (env) {
      const rules: { source: string; destination: string; basePath?: false }[] = [
        {
          source: "/gcc/:path*",
          destination: `https://gcc.${env}.payglocal.in/gcc/:path*`,
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
