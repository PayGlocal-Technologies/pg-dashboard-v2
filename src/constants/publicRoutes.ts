/**
 * Dynamic public route patterns — mirrors pg-dashboard's PUBLIC_ROUTE_PATTERNS.
 *
 * Routes that carry a 6-char ID in their path segment need special middleware
 * handling: the ID is extracted, stored in the `influencerId` cookie, and the
 * request is rewritten to /login so the login flow can pick it up.
 *
 * NOTE: despite the name the `/frl`, `/mca`, and `/prt` patterns carry a *deal
 * code*, not an influencer ID — but pg-dashboard stores all of them under the
 * single `influencerId` cookie name, and we replicate that behaviour here.
 */
export const PUBLIC_ROUTE_PATTERNS = [
  /^\/inf\/([a-zA-Z0-9_-]{6})$/,
  /^\/amz(?:\/([a-zA-Z0-9_-]{6})(?:\/([a-zA-Z0-9_-]+))?)?$/,
  /^\/frl\/([a-zA-Z0-9_-]{6})$/,
  /^\/mca\/([a-zA-Z0-9_-]{6})(?:\/([a-zA-Z0-9_-]+))?$/,
  /^\/prt\/([a-zA-Z0-9_-]{6})$/,
];

/** Prefix-based routes that are always public (no session required). */
export const PUBLIC_ROUTE_PREFIXES = [
  "/login",
  "/forgot-password",
  "/risk-underwriting",
  "/__/auth",
  "/inf",
  "/mca",
  "/amz",
  "/frl",
  "/prt",
  "/ovd/validate",
  "/ovd/capture",
] as const;
