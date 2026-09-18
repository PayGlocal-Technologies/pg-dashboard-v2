/**
 * Per-tour "seen" flag persistence. One localStorage key per guided screen so a
 * merchant is walked through each screen exactly once, mirroring the
 * window-guarded read/write pattern used by the dashboard widget catalog.
 *
 * Keys are namespaced under `payglocal_guide_` and callers pass the bare tour id
 * (e.g. "mca-dashboard-v1"). Bump the version suffix in the caller's id when the
 * steps change enough that returning merchants should see the tour again.
 */
const PREFIX = "payglocal_guide_";

export function isGuideCompleted(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(PREFIX + key) === "done";
  } catch {
    return false;
  }
}

export function markGuideCompleted(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFIX + key, "done");
  } catch {
    /* storage unavailable (private mode / quota) — degrade to showing again */
  }
}

/** Clears the flag so the tour runs again — useful for a "Replay guide" action. */
export function resetGuide(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* no-op */
  }
}
