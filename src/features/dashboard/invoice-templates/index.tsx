"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  Input,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Shimmer,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { MidGuard } from "@/components/common/MidGuard";
import { useInvoiceThemes } from "@/features/dashboard/create-invoice/hooks";
import { toDateKey } from "@/features/dashboard/create-invoice/components/InvoiceHeaderChips";
import { useInvoiceTemplates } from "@/features/dashboard/invoice-templates/hooks";
import { InvoiceTabs } from "@/features/dashboard/invoice-templates/components/InvoiceTabs";
import { TemplateCard } from "@/features/dashboard/invoice-templates/components/TemplateCard";
import { StartFromInvoiceDialog } from "@/features/dashboard/invoice-templates/components/StartFromInvoiceDialog";
import {
  DELETE_UNDO_MS,
  SEARCH_THRESHOLD,
  TEMPLATE_SORTS,
  type TemplateSortId,
} from "@/features/dashboard/invoice-templates/constants";
import type { InvoiceTemplate } from "@/features/dashboard/invoice-templates/types";

/**
 * Saved invoice templates, at /mca-invoices/templates.
 *
 * A route rather than the modal this used to be. A modal is the right container
 * for a short interruption; managing templates is a browsing-and-editing task
 * over a persistent object set, and it wants room for a search field, a sort
 * control, thumbnails, and somewhere for the editor to return to.
 *
 * It sits inside <MidGuard> like the invoice list beside it, which is what
 * fixes the old failure where a merchant with several PACB MIDs and none
 * selected was told they had no templates rather than being asked to pick one.
 */
export function InvoiceTemplatesFeature() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-4 page-enter">
      <PageHeader title="Invoice management" />
      <InvoiceTabs />
      <MidGuard productType="PACB">
        <TemplatesContent />
      </MidGuard>
    </div>
  );
}

function TemplatesContent() {
  const router = useRouter();
  const store = useInvoiceTemplates();
  const palette = useInvoiceThemes();

  // Lazy initializer: `new Date()` must not run on every render.
  const [today] = useState(() => toDateKey(new Date()));

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<TemplateSortId>("recent");
  const [startFromInvoiceOpen, setStartFromInvoiceOpen] = useState(false);

  /**
   * Templates removed from view but not yet deleted on the server.
   *
   * See DELETE_UNDO_MS: the DELETE is held so that undo restores the same
   * template rather than a copy under a new id.
   */
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  /**
   * Fire every held DELETE on the way out.
   *
   * Without this, navigating away inside the undo window silently keeps a
   * template the merchant deleted — the timer dies with the component and the
   * request is never sent. The refs are read rather than the state so the
   * cleanup does not need to re-run as the pending set changes.
   */
  const removeRef = useRef(store.remove);
  useEffect(() => {
    removeRef.current = store.remove;
  });
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const [templateId, timer] of timers) {
        clearTimeout(timer);
        removeRef.current(templateId);
      }
      timers.clear();
    };
  }, []);

  const handleDelete = useCallback(
    (template: InvoiceTemplate) => {
      setPendingDeletes((ids) => [...ids, template.id]);

      // The id stays in `pendingDeletes` after the request goes out. Clearing it
      // here would put the card back on screen until the list refetch landed,
      // which reads as the delete having failed. Once the server has it, the
      // template is gone from `store.templates` too, so a stale id in this list
      // filters nothing and costs nothing.
      const commit = () => {
        timersRef.current.delete(template.id);
        store.remove(template.id);
      };

      const timer = setTimeout(commit, DELETE_UNDO_MS);
      timersRef.current.set(template.id, timer);

      toast(`Deleted "${template.name}"`, {
        duration: DELETE_UNDO_MS,
        action: {
          label: "Undo",
          onClick: () => {
            const held = timersRef.current.get(template.id);
            if (!held) return;
            clearTimeout(held);
            timersRef.current.delete(template.id);
            setPendingDeletes((ids) => ids.filter((id) => id !== template.id));
          },
        },
      });
    },
    [store]
  );

  /** Everything not awaiting or past a delete. Counted, then filtered. */
  const live = useMemo(
    () => store.templates.filter((template) => !pendingDeletes.includes(template.id)),
    [store.templates, pendingDeletes]
  );

  const visible = useMemo(() => {
    const wanted = query.trim().toLowerCase();
    const rows = live.filter(
      (template) =>
        !wanted ||
        template.name.toLowerCase().includes(wanted) ||
        template.description.toLowerCase().includes(wanted) ||
        template.snapshot.lineItems.some((item) => item.description.toLowerCase().includes(wanted))
    );

    // The hook already sorts most-recently-used first, which is the default
    // here too; the other two orders re-sort a copy.
    if (sort === "name") {
      return [...rows].sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sort === "created") {
      return [...rows].sort((a, b) => Number(b.savedAt ?? 0) - Number(a.savedAt ?? 0));
    }
    return rows;
  }, [live, query, sort]);

  const total = live.length;
  const showSearch = total > SEARCH_THRESHOLD || !!query;

  if (!store.isReady) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Shimmer key={i} className="h-[19rem] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {showSearch && (
            <div className="relative">
              <Icon
                name="search"
                className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search templates"
                aria-label="Search templates"
                autoComplete="off"
                className="h-9 w-[15rem] pl-8 text-[13px]"
              />
            </div>
          )}
          {total > 1 && (
            <Select value={sort} onValueChange={(next) => setSort(next as TemplateSortId)}>
              <SelectTrigger className="h-9 w-[11.5rem]" aria-label="Sort templates">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_SORTS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Creation lives here as well as in the invoice editor. A merchant
            setting up their account should not have to start a throwaway
            invoice to get their first template. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
            >
              New template
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuItem onSelect={() => router.push("/invoice-template/new")}>
              <Icon name="file-text" className="mr-2 h-3.5 w-3.5" />
              Blank template
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setStartFromInvoiceOpen(true)}>
              <Icon name="copy" className="mr-2 h-3.5 w-3.5" />
              Start from a past invoice
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={query ? "No templates match that search" : "No templates yet"}
          description={
            query
              ? "Try a different name, or clear the search to see all of them."
              : "A template saves an invoice's items, terms and branding so the next one starts filled in. Create a blank one, or start from an invoice you have already sent."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              palette={palette}
              today={today}
              isMutating={store.mutatingId === template.id}
              onOpen={() => router.push(`/invoice-template/${template.id}`)}
              onRename={(name) => store.rename(template.id, name)}
              onDuplicate={() =>
                store.duplicate(template.id, () =>
                  toast.success("Template duplicated", {
                    description: `A copy of "${template.name}" is ready to edit.`,
                  })
                )
              }
              onDelete={() => handleDelete(template)}
              isNameTaken={(name) => store.isNameTaken(name, template.id)}
            />
          ))}
        </div>
      )}

      <StartFromInvoiceDialog
        open={startFromInvoiceOpen}
        onOpenChange={setStartFromInvoiceOpen}
        onPick={(invoiceId) => router.push(`/invoice-template/new?fromInvoice=${invoiceId}`)}
      />
    </div>
  );
}
