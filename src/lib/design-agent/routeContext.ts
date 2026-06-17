/**
 * Builds a short context block injected at the top of every Design Agent prompt.
 * Tells Claude which page the designer is currently viewing and where its files live,
 * saving 2-3 Read/Glob tool calls per turn on long sessions.
 */
import { access, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

async function pathExists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

/**
 * Find a directory named `target` under `baseDir`, recursing into Next.js
 * route groups (parenthesised dirs like `(dashboard)`) but not deeper than
 * `maxDepth` levels.
 */
async function findRouteDir(baseDir: string, target: string, depth = 0): Promise<string | null> {
  if (depth > 5) return null;
  let entries;
  try { entries = await readdir(baseDir, { withFileTypes: true }); } catch { return null; }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === target) return join(baseDir, entry.name);
    // Always recurse into route groups; recurse shallowly into others.
    if (entry.name.startsWith("(") || depth === 0) {
      const sub = await findRouteDir(join(baseDir, entry.name), target, depth + 1);
      if (sub) return sub;
    }
  }
  return null;
}

/**
 * Build a concise context string for the given pathname. Returns empty string
 * for unknown or root routes (no useful context to inject).
 *
 * Example output:
 *   [Page context — designer is on /transactions]
 *   Page file: src/app/(dashboard)/transactions/page.tsx
 *   Feature dir: src/features/transactions/
 *   Feature files: index.tsx, types.ts, constants.ts, services.ts
 *   Feature components: TransactionTable.tsx, StatusFilter.tsx
 */
export async function buildRouteContext(route: string, cwd: string): Promise<string> {
  // Extract the primary (first non-dynamic, non-root) segment.
  const segment = route.split("/").filter((s) => s && !s.startsWith("["))[0];
  if (!segment) return "";

  const appDir = join(cwd, "src", "app");
  const featuresDir = join(cwd, "src", "features");
  const lines: string[] = [`[Page context — designer is currently on ${route}]`];

  // --- Page file ---
  const routeDir = await findRouteDir(appDir, segment);
  if (routeDir) {
    for (const name of ["page.tsx", "page.ts"]) {
      const full = join(routeDir, name);
      if (await pathExists(full)) {
        lines.push(`Page file: ${relative(cwd, full)}`);
        break;
      }
    }
  }

  // --- Feature directory ---
  const featureDir = join(featuresDir, segment);
  if (await pathExists(featureDir)) {
    lines.push(`Feature dir: src/features/${segment}/`);

    try {
      const entries = await readdir(featureDir, { withFileTypes: true });

      const rootFiles = entries
        .filter((e) => !e.isDirectory() && /\.(tsx?|jsx?)$/.test(e.name))
        .map((e) => e.name);
      if (rootFiles.length) lines.push(`Feature files: ${rootFiles.join(", ")}`);

      const componentsDir = join(featureDir, "components");
      if (await pathExists(componentsDir)) {
        const compEntries = await readdir(componentsDir, { withFileTypes: true });
        const compFiles = compEntries
          .filter((e) => !e.isDirectory() && /\.(tsx?|jsx?)$/.test(e.name))
          .map((e) => e.name);
        if (compFiles.length) lines.push(`Feature components: ${compFiles.join(", ")}`);
      }
    } catch {
      /* ignore readdir errors */
    }
  }

  return lines.join("\n");
}
