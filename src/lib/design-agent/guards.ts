/**
 * Safety gates for the Design Agent. Server-only.
 *
 * Two responsibilities:
 *  1. Confirm the agent is allowed to run at all (development only).
 *  2. Decide whether a filesystem path is a secret the agent must never touch.
 *     This list is the single source of truth, shared by the route handlers and
 *     the PreToolUse hook (`hooks/secret-guard.mjs`).
 */

/**
 * The agent runs ONLY in local development. In production the route handlers
 * 404 and the overlay renders nothing (see DESIGN-AGENT-IMPLEMENTATION.md §11).
 */
export function isDevAgentEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_ENV !== "production";
}

/**
 * Paths the agent may never read, edit, or reference in a shell command.
 * Compliance: this protects card/PII/credential material and the cert bundles
 * present in pg-dashboard (a read-only reference dir).
 */
export const SECRET_PATH_PATTERNS: RegExp[] = [
  /(^|\/)\.env(\.|$)/i, // .env, .env.local, .env.uat ...
  /(^|\/)\.git\/config$/i,
  /uidai_certs?_?js/i, // pg-dashboard cert bundle
  /\.(pem|key|p12|pfx|jks|keystore)$/i,
  /(^|\/)(secrets?|credentials?)(\/|\.|$)/i,
  /id_rsa|id_ed25519|\.ssh\//i,
  /\.npmrc$/i,
];

/** True if the given path looks like secret/credential material. */
export function isSecretPath(p: string): boolean {
  if (!p) return false;
  const normalized = p.replace(/\\/g, "/");
  return SECRET_PATH_PATTERNS.some((re) => re.test(normalized));
}

/**
 * Detects whether a Claude Code result/error indicates the subscription's
 * monthly Agent credit pool is exhausted (vs. a normal failure). Used to give
 * the designer a "resume when credits refill" state rather than a raw error.
 */
export function isCreditExhaustion(message: string | undefined): boolean {
  if (!message) return false;
  return /credit|usage limit|rate limit|quota|insufficient|out of (credits|tokens)/i.test(message);
}
