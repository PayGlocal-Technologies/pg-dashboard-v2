"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  Input,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { useApp } from "@/stores/useApp";
import { toProductType, useProductContext } from "@/stores/useProductContext";
import useNewPermissions from "@/hooks/useNewPermissions";
import { filterNavigation, navigationForContext } from "@/lib/navigation";
import { SETTINGS_NAV_GROUPS } from "@/features/dashboard/settings/constants";
import { buildSearchRegistry } from "@/lib/search/registry";
import { popularResults, resolveQuery, type SearchResult } from "@/lib/search/resolve";

const PLACEHOLDER = "Search payment products, settings, and more";

/**
 * The header's global search.
 *
 * Everything it offers is resolved in the browser from the same nav trees the
 * sidebar renders — no request per keystroke, and nothing to debounce. Two
 * kinds of row, rendered identically in one flat list:
 *
 *   a page      "Banking & currencies"  in: Settings
 *   a lookup    "GLxxxxxxxx"            in: Transactions
 *
 * A lookup row hands the query to a table that can resolve it, as `?q=`. It
 * never fetches anything itself.
 *
 * flux's Command primitives are a presentational shell — no state, no
 * filtering, no keyboard handling — so the highlight, arrow keys, Enter and
 * scroll-into-view are all owned here.
 */
export function GlobalSearch() {
  const router = useRouter();
  const isPartnerUser = useApp((s) => s.isPartnerUser);
  const isGlobalTenant = useApp((s) => s.isGlobalTenant);
  const activeContext = useProductContext((s) => s.activeContext);
  const checkPermissions = useNewPermissions();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  // Below md the input collapses to an icon; this is whether it has been
  // expanded over the tab row.
  const [expanded, setExpanded] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // The same two calls the Sidebar makes, so the index and the sidebar can
  // never disagree about what this user can reach. Rebuilds when the header
  // tab changes, and at no other time.
  const registry = useMemo(
    () =>
      buildSearchRegistry(
        filterNavigation(
          navigationForContext({ isPartnerUser, isGlobalTenant, activeContext }),
          checkPermissions,
          toProductType(activeContext)
        ),
        SETTINGS_NAV_GROUPS,
        { isPartnerUser }
      ),
    [isPartnerUser, isGlobalTenant, activeContext, checkPermissions]
  );

  const trimmed = query.trim();
  const isEmptyQuery = trimmed.length === 0;

  const results = useMemo(
    () =>
      isEmptyQuery
        ? popularResults(registry, activeContext)
        : resolveQuery(query, registry, activeContext),
    [isEmptyQuery, query, registry, activeContext]
  );

  // Clamped rather than reset through an effect: the index is only ever moved
  // by a keypress, so deriving the safe value keeps it correct when the result
  // list shrinks under it without a synchronous setState in an effect body
  // (see CLAUDE.md).
  const highlighted = results.length ? Math.min(highlightedIndex, results.length - 1) : -1;

  // Cmd/Ctrl+K focuses the input from anywhere in the dashboard shell. Safe to
  // bind globally: it is a modifier combo, so it cannot shadow ordinary typing
  // in another field.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      setExpanded(true);
      setOpen(true);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Outside click. Deliberately not an onBlur on the input: a row is a div
  // rather than a focusable control, so blurring to click one would close the
  // dropdown before the click landed.
  useEffect(() => {
    function onMouseDown(event: MouseEvent): void {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
      setExpanded(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Keeps the highlighted row visible while arrowing through a list taller than
  // the panel. A DOM call, not state, so it belongs in an effect.
  useEffect(() => {
    if (!open || highlighted < 0) return;
    listRef.current
      ?.querySelector(`[data-index="${highlighted}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, highlighted]);

  const select = (result: SearchResult): void => {
    setOpen(false);
    setExpanded(false);
    setQuery("");
    setHighlightedIndex(0);
    inputRef.current?.blur();
    router.push(result.path);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex((index) => Math.min(index + 1, results.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      const result = results[highlighted];
      if (!open || !result) return;
      event.preventDefault();
      select(result);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      // Clear first, close on the second press — so Escape never throws away
      // a half-typed query and the dropdown in one go.
      if (query) {
        setQuery("");
        setHighlightedIndex(0);
        return;
      }
      setOpen(false);
      setExpanded(false);
      inputRef.current?.blur();
      return;
    }
    if (event.key === "Tab") setOpen(false);
  };

  const rows = results.map((result, index) => (
    <CommandItem
      key={result.key}
      id={`global-search-option-${index}`}
      data-index={index}
      selected={index === highlighted}
      onSelect={() => select(result)}
      onMouseEnter={() => setHighlightedIndex(index)}
      className="gap-2.5"
    >
      <Icon name={result.icon} size={15} className="shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">{result.label}</span>
      {result.badge && (
        // The reference's dark chip. bg-foreground/text-background rather than a
        // fixed colour so it inverts correctly with the theme, and so it stays
        // legible on the selected row's bg-muted.
        <span className="shrink-0 rounded-md bg-foreground px-1.5 py-0.5 text-[11px] font-medium text-background">
          in: {result.badge}
        </span>
      )}
    </CommandItem>
  ));

  return (
    <div
      ref={rootRef}
      className="relative ml-auto flex h-9 w-9 items-center justify-end md:w-full md:max-w-[380px]"
    >
      {/* Below md the header has no room for a 380px field next to the product
          tabs, so it collapses to this button and expands over the tab row. */}
      <Button
        variant="ghost"
        onClick={() => {
          setExpanded(true);
          setOpen(true);
          inputRef.current?.focus();
        }}
        aria-label="Search"
        className={cn("h-9 w-9 text-muted-foreground hover:text-foreground md:hidden", {
          hidden: expanded,
        })}
      >
        <Icon name="search" size={18} />
      </Button>

      <div
        className={cn(
          "absolute right-0 top-1/2 w-[min(72vw,320px)] -translate-y-1/2",
          "md:static md:w-full md:translate-y-0",
          expanded ? "block" : "hidden md:block"
        )}
      >
        <Icon
          name="search"
          className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="global-search-listbox"
          aria-activedescendant={
            open && highlighted >= 0 ? `global-search-option-${highlighted}` : undefined
          }
          aria-label="Search the dashboard"
          autoComplete="off"
          placeholder={PLACEHOLDER}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            // Back to the top row on every edit, so Enter always commits the
            // best match rather than wherever the highlight happened to sit.
            setHighlightedIndex(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-9 bg-muted/50 pl-8 pr-8 text-xs"
        />
        {query && (
          <Button
            variant="ghost"
            onClick={() => {
              setQuery("");
              setHighlightedIndex(0);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="absolute right-1 top-1/2 h-6 w-6 min-h-0 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <Icon name="x" size={14} />
          </Button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-[calc(100%+6px)] z-50 w-[min(92vw,420px)] md:w-full"
          >
            <Command>
              <CommandList ref={listRef} id="global-search-listbox">
                {results.length === 0 ? (
                  <CommandEmpty>No results for &ldquo;{trimmed}&rdquo;</CommandEmpty>
                ) : isEmptyQuery ? (
                  // The only heading anywhere in the dropdown. Results carry
                  // none — matching the reference, where pages and lookups are
                  // one unlabelled list.
                  <CommandGroup heading="Popular searches">{rows}</CommandGroup>
                ) : (
                  <CommandGroup>{rows}</CommandGroup>
                )}
              </CommandList>
            </Command>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
