/**
 * The sub-path this app is served from.
 *
 * pg-dashboard already owns "/app" on the same host, so v2 mounts alongside it
 * rather than at the root. At cutover this becomes "/app" and nothing else has
 * to change.
 *
 * Fed to next.config.ts's `basePath` and `assetPrefix`, which is enough for
 * everything that goes through the framework: next/link, next/navigation
 * (router.push, redirect), next/image, and the `public/` folder all get the
 * prefix added for free. What Next cannot rewrite is a raw browser
 * navigation — `window.location.href = "/login"` is handed straight to the
 * browser — which is what withBasePath below is for.
 */
export const BASE_PATH = "/app-v2";

/**
 * Paths on this host that belong to something other than this app, and so must
 * never be given our base path.
 *
 * - /gcc      the API, proxied by a rewrite that sets `basePath: false`, so it
 *             is matched at the origin root regardless of where the app sits.
 * - /gl-gcc   the legacy GCC app, a separate deployment.
 * - /__/auth  Firebase's auth handler.
 */
const FOREIGN_PREFIXES = ["/gcc/", "/gl-gcc/", "/__/auth"];

/**
 * Prefixes an app-internal path for a raw `window.location` navigation.
 *
 * Absolute URLs, and paths owned by the neighbouring apps listed above, are
 * returned untouched — prefixing those would point them at routes this app
 * does not serve.
 */
export function withBasePath(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  if (FOREIGN_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix))) return path;
  // Already prefixed: a ?from= or stored redirect captured from a real URL
  // carries the base path already, and adding a second one would 404.
  if (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`)) return path;
  return `${BASE_PATH}${path}`;
}
