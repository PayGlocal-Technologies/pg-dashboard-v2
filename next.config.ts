import type { NextConfig } from "next";

const env = process.env.NEXT_PUBLIC_ENV;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: ["@payglocal_ui/flux-ui"],
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
