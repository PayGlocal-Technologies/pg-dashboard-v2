/**
 * Persists the Claude session id per git branch so a designer can resume a
 * conversation later — crucially, after their monthly Agent credits refill.
 * Server-only.
 *
 * Stored at <cwd>/.design-agent/sessions.json (gitignored). This is dev-only
 * tooling state, never shipped.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = () => join(process.cwd(), ".design-agent");
const file = () => join(dir(), "sessions.json");

type Store = Record<string, string>; // branch -> sessionId

function read(): Store {
  try {
    if (!existsSync(file())) return {};
    return JSON.parse(readFileSync(file(), "utf8")) as Store;
  } catch {
    return {};
  }
}

function write(store: Store): void {
  if (!existsSync(dir())) mkdirSync(dir(), { recursive: true });
  writeFileSync(file(), JSON.stringify(store, null, 2), "utf8");
}

/** Current git branch, or "detached" if it can't be determined. */
export function currentBranch(): string {
  try {
    return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: process.cwd(),
      encoding: "utf8",
    }).trim();
  } catch {
    return "detached";
  }
}

/** Last known session id for the current branch (for `--resume`). */
export function getSessionId(branch = currentBranch()): string | undefined {
  return read()[branch];
}

/** Remember the session id for the current branch. */
export function setSessionId(sessionId: string, branch = currentBranch()): void {
  if (!sessionId) return;
  const store = read();
  store[branch] = sessionId;
  write(store);
}
