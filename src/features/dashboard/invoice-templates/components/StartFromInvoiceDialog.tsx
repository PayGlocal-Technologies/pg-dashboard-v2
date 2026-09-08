"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  EmptyState,
  Input,
  Shimmer,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { usePostQuery } from "@/lib/api/hooks";
import { useScopeId } from "@/lib/hooks/useScopeId";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import { formatDate } from "@/lib/utils/format";
import { allInvoicesApi } from "@/features/dashboard/mca-invoices/services";
import { buildInvoiceRequestBody } from "@/features/dashboard/mca-invoices/helpers";
import type {
  InvoiceSearchBody,
  McaInvoicesResponse,
} from "@/features/dashboard/mca-invoices/types";

/** How many recent invoices the picker offers before asking you to search. */
const PICKER_LIMIT = 25;

/**
 * How long after a keystroke the search actually goes out.
 *
 * The list behind this endpoint is a POST, so react-query keys on the body and
 * every character typed was a request — eight for "retainer", of which seven
 * were already stale when they landed.
 */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * "Start from a past invoice."
 *
 * The way merchants actually think about a first template: not "compose one
 * from nothing" but "the one I sent Acme last month, again." Without this, the
 * only route to a template that resembles real work is to apply nothing, retype
 * everything, and hope it matches.
 *
 * It picks an invoice and nothing more — the template editor does the reading,
 * so this dialog needs no knowledge of what a snapshot contains.
 */
export function StartFromInvoiceDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (invoiceId: string) => void;
}) {
  const { scopeId } = useScopeId("PACB");
  const paCbMids = useApp((s) => s.paCbMids);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);
  const [search, setSearch] = useState("");

  /**
   * The search the request actually carries, a beat behind the field.
   *
   * setState in a timer callback rather than in the effect body, which the
   * React Compiler lint plugin rejects (see CLAUDE.md).
   */
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  /**
   * Which MIDs the picker may offer, matching McaInvoiceTable exactly.
   *
   * It used to pass `mids: []`, which omits `fieldSearch.mid` altogether and so
   * searched wider than the invoice list does. That let a merchant pick an
   * invoice belonging to a MID other than the one the template editor resolves,
   * and the editor's own `getInvoiceDetailsApi(merchantId, …)` read would then
   * fail against a MID that does not hold it.
   */
  const mids = useMemo(() => (selectedMid ? [selectedMid] : paCbMids), [selectedMid, paCbMids]);

  const body = useMemo(
    () =>
      buildInvoiceRequestBody(
        {},
        { mids, searchQuery: debouncedSearch, pageLimit: PICKER_LIMIT, from: 0 }
      ),
    [mids, debouncedSearch]
  );

  const { data, isPending, isError } = usePostQuery<McaInvoicesResponse, InvoiceSearchBody>(
    ["template-source-invoices", scopeId],
    allInvoicesApi(scopeId),
    body,
    { staleTime: 0 },
    // Only while the dialog is open: this is a POST, and firing it behind a
    // closed dialog on every list render would be a request per mount.
    open && !!scopeId && mids.length > 0
  );

  const rows = data?.data?.data ?? [];
  // The field, not the debounced copy: what the merchant typed is what an empty
  // result is about, and lagging this by 300ms shows "No invoices yet" over a
  // search that has one.
  const isSearching = !!search.trim();
  // A keystroke ahead of the request. Without this the list shows the previous
  // result as though it matched what is now in the field.
  const isStale = search !== debouncedSearch;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogTitle>Start from a past invoice</DialogTitle>
        <DialogDescription>
          The invoice&apos;s items, terms and branding are copied into a new template. The client,
          invoice number and dates are not.
        </DialogDescription>

        <div className="relative mt-4">
          <Icon
            name="search"
            className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice number or client"
            aria-label="Search invoices"
            autoComplete="off"
            className="h-9 pl-8 text-[13px]"
          />
        </div>

        <div className="mt-3 max-h-[22rem] overflow-y-auto">
          {isPending || isStale ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Shimmer key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : isError ? (
            /* Said rather than swallowed. An error used to fall through to the
               empty state, which told the merchant they had no invoices — a
               confident wrong answer about their own data. */
            <EmptyState
              title="Couldn't load your invoices"
              description="Something went wrong fetching the list. Close this and try again."
            />
          ) : rows.length === 0 ? (
            <EmptyState
              title={isSearching ? "No invoices match that search" : "No invoices yet"}
              description={
                isSearching
                  ? "Try an invoice number or a client name."
                  : "Create and send an invoice first, then you can reuse its shape here."
              }
            />
          ) : (
            <div className="divide-y divide-border">
              {rows.map((row) => (
                <Button
                  key={row.id}
                  type="button"
                  variant="ghost"
                  className="h-auto w-full justify-start rounded-none px-2 py-2.5 text-left [&>span]:min-w-0 [&>span]:flex-1"
                  onClick={() => {
                    onOpenChange(false);
                    onPick(row.id);
                  }}
                >
                  <span className="flex w-full items-center justify-between gap-3">
                    <span className="block min-w-0">
                      <span className="block truncate text-[13px] font-medium text-foreground">
                        {row.clientBusinessName || row.clientName || "No client"}
                      </span>
                      <span className="block truncate text-[11.5px] font-normal text-muted-foreground">
                        {row.invoiceNumber || "No number"}
                        {row.invoiceDate && ` · ${formatDate(new Date(row.invoiceDate))}`}
                      </span>
                    </span>
                    <span className="shrink-0 text-[12px] font-medium tabular-nums text-muted-foreground">
                      {row.currency} {row.totalAmount}
                    </span>
                  </span>
                </Button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
