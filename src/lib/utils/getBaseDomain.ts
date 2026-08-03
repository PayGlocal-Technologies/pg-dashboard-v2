/* Both payglocal.in and pygcl.com are live during the UAT domain migration.
   Derive the base domain from the current host so pages, redirects, and CDN
   calls stay on one domain and share session cookies. Falls back to
   payglocal.in during SSR where no host is available. */
export function getBaseDomain(): string {
  return typeof window !== "undefined" && window.location.hostname.endsWith("pygcl.com")
    ? "pygcl.com"
    : "payglocal.in";
}
