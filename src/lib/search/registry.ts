import type { IconName } from "@/components/icon";
import type { NavGroup } from "@/lib/navigation";
import type { NavContext } from "@/stores/useProductContext";
import type { UseNewPermissionsFn } from "@/hooks/useNewPermissions";
import type { SettingsNavGroup } from "@/features/dashboard/settings/constants";
import {
  ACTION_ENTRIES,
  NAVIGABLE_ROUTES,
  SEARCH_KEYWORDS,
  STANDALONE_PAGES,
} from "@/lib/search/config";

/** One searchable destination. */
export interface SearchEntry {
  /**
   * Where the entry goes, which doubles as its identity — entries dedupe on it.
   * A page's plain href, or an action's own route or `?action=` handoff, so this
   * may carry a query string.
   */
  path: string;
  label: string;
  /**
   * The label of the page this one sits under, rendered as the `in: …` badge.
   * Absent for top-level pages, which carry no badge — matching the reference,
   * where "Transactions" is bare and "Refunds" reads `in: Transactions`.
   *
   * Note this is the parent *item*, not the nav group: a merchant looking for
   * "Banking & currencies" is helped by "in: Settings" and not by "in: Account
   * & Business", the group heading it happens to sit in.
   */
  parent?: string;
  icon: IconName;
  keywords: string[];
}

/**
 * Flattens the nav trees into a searchable list, then appends the actions those
 * pages own (see ACTION_ENTRIES) — the sidebar is not the whole surface, and a
 * merchant searching "create invoice" is after a thing to do, not a page.
 *
 * `navigation` must already have been through filterNavigation, so everything
 * here is something this user can actually reach. Settings entries are always
 * included regardless of product context — the sidebar footer links to
 * /settings from every tree.
 */
export function buildSearchRegistry(
  navigation: NavGroup[],
  settingsGroups: SettingsNavGroup[],
  {
    isPartnerUser = false,
    context,
    checkPermissions,
  }: {
    isPartnerUser?: boolean;
    /** The Header's active tab, for context-scoped STANDALONE_PAGES. */
    context?: NavContext;
    /** The same fn the Sidebar filters with, for permission-gated
     *  STANDALONE_PAGES. Omitting it drops every gated standalone page. */
    checkPermissions?: UseNewPermissionsFn;
  } = {}
): SearchEntry[] {
  const entries: SearchEntry[] = [];
  // First occurrence of a path wins. /mca-receipts appears three times across the
  // trees under three labels ("Receipts" twice, "GST Invoices" once) and
  // /team-management appears in several, so without this the dropdown would
  // offer the same destination repeatedly.
  const seen = new Set<string>();

  const push = (entry: Omit<SearchEntry, "keywords">): void => {
    if (seen.has(entry.path)) return;
    if (!NAVIGABLE_ROUTES.has(entry.path)) return;
    seen.add(entry.path);
    entries.push({ ...entry, keywords: SEARCH_KEYWORDS[entry.path] ?? [] });
  };

  for (const group of navigation) {
    for (const item of group.items) {
      // A parent with children is a toggle in the sidebar — ExpandableItem
      // only opens and closes it, it never navigates to item.href — so the
      // children are always emitted.
      //
      // The parent is emitted *too*, and only NAVIGABLE_ROUTES decides whether
      // it survives. That allowlist is exactly the "does this href have a
      // page" test, so the hrefs this used to guard against (/payment-products,
      // /configure, /settings) are still dropped, while /ebrc — a real landing
      // page that grew two children when eBRC Status and IRM Repository
      // landed — is not. Skipping every parent outright would have made search
      // silently lose a page the moment it gained a child.
      if (item.children?.length) {
        push({ path: item.href, label: item.label, icon: item.icon });
        for (const child of item.children) {
          push({ path: child.href, label: child.label, parent: item.label, icon: item.icon });
        }
        continue;
      }
      push({ path: item.href, label: item.label, icon: item.icon });
    }
  }

  for (const group of settingsGroups) {
    for (const item of group.items) {
      if (item.children?.length) {
        push({ path: item.href, label: item.label, parent: "Settings", icon: item.icon });
        for (const child of item.children) {
          push({ path: child.href, label: child.label, parent: item.label, icon: item.icon });
        }
        continue;
      }
      push({ path: item.href, label: item.label, parent: "Settings", icon: item.icon });
    }
  }

  // Pages the sidebar has no entry for at all — Refer & Earn and Echo off the
  // Header, My queries off its Help menu, and the MCA settlement list, which
  // the MCA tree dropped. Pushed through the same `push`, so the route
  // allowlist and the dedupe still apply, and each one's own gate mirrors what
  // filterNavigation would have done for it had it been a NavItem.
  for (const page of STANDALONE_PAGES) {
    if (page.hiddenForPartner && isPartnerUser) continue;
    if (page.context && page.context !== context) continue;
    if (page.permission?.length && !checkPermissions?.(page.permission)) continue;
    push({ path: page.path, label: page.label, icon: page.icon });
  }

  // Actions last, once every page is in, since each one's badge is its parent
  // page's label and its presence is gated on that page having survived.
  for (const action of ACTION_ENTRIES) {
    const parent = entries.find((entry) => entry.path === action.parentPath);
    if (!parent || seen.has(action.path)) continue;
    seen.add(action.path);
    entries.push({
      path: action.path,
      label: action.label,
      parent: parent.label,
      icon: action.icon,
      keywords: action.keywords ?? [],
    });
  }

  return entries;
}
