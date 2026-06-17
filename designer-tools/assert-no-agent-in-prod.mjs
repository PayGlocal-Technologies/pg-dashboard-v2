#!/usr/bin/env node
/**
 * Prod-safety gate. Run AFTER `next build` (e.g. `next build && node
 * designer-tools/assert-no-agent-in-prod.mjs`). Fails the build if any Design
 * Agent CLIENT code leaked into the production bundle.
 *
 * We grep the client static chunks for a sentinel string that only exists in the
 * agent's client hook (the localStorage key). The dev-only gates should have
 * dead-code-eliminated the whole subtree; if this sentinel is present, the gating
 * regressed. (Server route handlers legitimately reference the agent and 404 at
 * runtime in prod, so we only scan the client bundle here.)
 *
 * See DESIGN-AGENT-IMPLEMENTATION.md §11.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SENTINEL = "design-agent:sessionId";
const CLIENT_DIR = join(process.cwd(), ".next", "static");

function walk(dir) {
  let hits = [];
  let entries = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return hits;
  }
  for (const name of entries) {
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) hits = hits.concat(walk(full));
    else if (full.endsWith(".js")) {
      if (readFileSync(full, "utf8").includes(SENTINEL)) hits.push(full);
    }
  }
  return hits;
}

const leaks = walk(CLIENT_DIR);
if (leaks.length > 0) {
  console.error("\n✗ Design Agent client code leaked into the production bundle:");
  for (const f of leaks) console.error("   " + f);
  console.error(
    "\n  The dev-only gate regressed. Ensure the overlay is rendered only behind\n" +
    "  `process.env.NODE_ENV === 'development'` and not statically forced anywhere.\n",
  );
  process.exit(1);
}

