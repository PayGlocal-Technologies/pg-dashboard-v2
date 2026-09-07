import {
  globalNavigation,
  homeNavigation,
  mcaNavigation,
  partnerNavigation,
  regularNavigation,
  type NavGroup,
} from "@/lib/navigation";

/**
 * A flat `href → label` map built from every nav tree this app already has
 * (`src/lib/navigation.ts`), rather than a second hand-maintained list of
 * page names — so "Add context of this page" always agrees with what the
 * sidebar itself calls the current screen.
 */
function flattenLabels(groups: NavGroup[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const group of groups) {
    for (const item of group.items) {
      map.set(item.href, item.label);
      for (const child of item.children ?? []) {
        map.set(child.href, child.label);
      }
    }
  }
  return map;
}

const PAGE_LABELS = new Map<string, string>([
  ...flattenLabels(homeNavigation),
  ...flattenLabels(regularNavigation),
  ...flattenLabels(mcaNavigation),
  ...flattenLabels(partnerNavigation),
  ...flattenLabels(globalNavigation),
]);

/** Longest-prefix match, so a detail route like `/pa-transactions/txn_123`
 *  still resolves to "Transactions" rather than falling through to the raw
 *  path. */
function matchByPrefix(pathname: string): string | undefined {
  let best: { href: string; label: string } | undefined;
  for (const [href, label] of PAGE_LABELS) {
    if (pathname === href || pathname.startsWith(`${href}/`)) {
      if (!best || href.length > best.href.length) best = { href, label };
    }
  }
  return best?.label;
}

/** Turns an unmapped path's last segment into a readable fallback, e.g.
 *  "/create-invoice" → "Create invoice". */
function humanize(pathname: string): string {
  const last = pathname.split("/").filter(Boolean).pop() ?? "";
  if (!last) return "Dashboard";
  return last
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getEchoPageContextLabel(pathname: string): string {
  return matchByPrefix(pathname) ?? humanize(pathname);
}
