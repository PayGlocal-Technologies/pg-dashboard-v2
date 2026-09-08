/**
 * Environment-derived hosts.
 *
 * Every PayGlocal host this app talks to is the same name under a
 * per-environment domain, and the two rules are easy to get wrong when the URL
 * is assembled at the call site:
 *
 * - only UAT has moved to pygcl.com; dev and prod stay on payglocal.in;
 * - prod carries no environment label (`dashboard.payglocal.in`, not
 *   `prod.dashboard.payglocal.in`).
 *
 * So the origins are stored here as explicit maps rather than built from
 * `NEXT_PUBLIC_ENV` at each site. Both rules live in one greppable place, and a
 * host that moves domain is a one-line edit.
 *
 * Imported by next.config.ts as well as app code, so this module must stay
 * dependency-free — the config is evaluated by Next's own loader, outside the
 * app bundle.
 */

export const ENV_VALUES = ["dev", "uat", "prod"] as const;

export type AppEnv = (typeof ENV_VALUES)[number];

const DEFAULT_ENV: AppEnv = "dev";

function isAppEnv(value: string | undefined): value is AppEnv {
  return !!value && (ENV_VALUES as readonly string[]).includes(value);
}

/**
 * The environment this build is running as.
 *
 * `NEXT_PUBLIC_ENV` is the source of truth (buildspec.yml sets it to one of the
 * slugs above). In the browser an unset or unrecognised value falls back to the
 * host's leading label, which covers a deploy that reached the CDN without the
 * build-time variable; on the server there is nothing to read, so it is dev.
 */
export function getAppEnv(): AppEnv {
  const env = process.env.NEXT_PUBLIC_ENV;
  if (isAppEnv(env)) return env;
  if (typeof window !== "undefined") {
    const label = window.location.hostname.split(".")[0];
    if (isAppEnv(label)) return label;
  }
  return DEFAULT_ENV;
}

/**
 * Origin of the merchant dashboard host.
 *
 * Also the origin the API is reached at: `/gcc/*` is served from behind the
 * dashboard host rather than the old standalone `gcc.<env>.<domain>` hosts,
 * which is what next.config.ts's rewrite proxies to.
 */
export const DASHBOARD_ORIGIN_BY_ENV: Record<AppEnv, string> = {
  dev: "https://dev.dashboard.payglocal.in",
  uat: "https://uat.dashboard.pygcl.com",
  prod: "https://dashboard.payglocal.in",
};

/** Origin of the CDN holding the public keys used for request encryption. */
export const CDN_ORIGIN_BY_ENV: Record<AppEnv, string> = {
  dev: "https://cdn.dev.payglocal.in",
  uat: "https://cdn.uat.pygcl.com",
  prod: "https://cdn.payglocal.in",
};

export function dashboardOrigin(env: AppEnv = getAppEnv()): string {
  return DASHBOARD_ORIGIN_BY_ENV[env];
}

export function cdnOrigin(env: AppEnv = getAppEnv()): string {
  return CDN_ORIGIN_BY_ENV[env];
}
