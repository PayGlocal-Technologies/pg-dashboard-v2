import type { IconName } from "@/components/icon";
import type { NavContext } from "@/stores/useProductContext";
import type { SearchEntry } from "@/lib/search/registry";
import { scoreFields } from "@/lib/search/fuzzy";
import { MAX_RESULTS, MIN_QUERY_LENGTH, lookupTargets, popularPaths } from "@/lib/search/config";

/** One row in the dropdown. Pages and lookups share this shape on purpose: the
 *  reference renders them identically, in one flat list, with no headings. */
export interface SearchResult {
  key: string;
  /** The feature name, or — for a lookup — the query the user typed. */
  label: string;
  /**
   * The `in: …` badge text: the parent page for a page row, the destination for
   * a lookup row. Absent on top-level pages.
   */
  badge?: string;
  /** Where selecting the row goes, `?q=` already appended for lookups. */
  path: string;
  icon: IconName;
}

/** The "Popular searches" rows, shown while the input is empty. */
export function popularResults(registry: SearchEntry[], context: NavContext): SearchResult[] {
  const byPath = new Map(registry.map((entry) => [entry.path, entry]));

  return popularPaths(context)
    .map((path) => byPath.get(path))
    .filter((entry): entry is SearchEntry => entry !== undefined)
    .map((entry) => ({
      key: `popular:${entry.path}`,
      label: entry.label,
      badge: entry.parent,
      path: entry.path,
      icon: entry.icon,
    }));
}

/**
 * Resolves a query into one flat, ranked list: page matches first, then lookup
 * rows to fill whatever room is left.
 *
 * One rule, and it explains every state the reference shows. Query "account"
 * matches plenty of pages, so they fill the list and no lookups appear. Query
 * "id_wds" or "sjdjhsd" matches nothing, so all six rows are lookups. The
 * dropdown is therefore never empty, and — because a lookup row claims nothing
 * about the query, only offering a place to search — there is no identifier
 * shape to detect and no false positives to tune.
 */
export function resolveQuery(
  query: string,
  registry: SearchEntry[],
  context: NavContext
): SearchResult[] {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) return [];

  const pages = registry
    .map((entry) => ({ entry, score: scoreFields(trimmed, entry) }))
    .filter((scored): scored is { entry: SearchEntry; score: number } => scored.score !== null)
    // Ties break alphabetically so the ordering is stable across renders rather
    // than dependent on the registry's own order.
    .sort((a, b) => b.score - a.score || a.entry.label.localeCompare(b.entry.label))
    .map(({ entry }) => ({
      key: `page:${entry.path}`,
      label: entry.label,
      badge: entry.parent,
      path: entry.path,
      icon: entry.icon,
    }));

  const reachable = new Set(registry.map((entry) => entry.path));
  const alreadyListed = new Set(pages.map((page) => page.path));

  const lookups = lookupTargets(context)
    // A target the user's tree doesn't include is a page they cannot open, so
    // it is not offered — permissions gate lookups exactly as they gate pages.
    .filter((target) => reachable.has(target.path))
    // A page already in the list above doesn't also need a lookup row for it:
    // "transactions" matching the Transactions page shouldn't also offer
    // "transactions in: Transactions" underneath it.
    .filter((target) => !alreadyListed.has(target.path))
    .map((target) => ({
      key: `lookup:${target.path}`,
      label: trimmed,
      badge: target.label,
      path: `${target.path}?q=${encodeURIComponent(trimmed)}`,
      icon: target.icon,
    }));

  return [...pages, ...lookups].slice(0, MAX_RESULTS);
}
