import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { InvoiceTemplate, InvoiceTemplateSnapshot } from "@/features/dashboard/create-invoice/types";

/**
 * Saved invoice templates, per merchant.
 *
 * ── Why this is a store and not a query ──────────────────────────────────────
 *
 * The templates endpoint does not exist yet. Rather than stub a URL and guess a
 * payload — which CLAUDE.md's migration checklist explicitly forbids, because
 * pg-dashboard is the source of truth for every contract — templates live in
 * localStorage until the real one lands.
 *
 * The swap is deliberately confined to ONE function: `useInvoiceTemplates()` in
 * `features/dashboard/create-invoice/hooks.ts`. It returns templates plus four
 * mutators, and every component above it (the picker, the two dialogs, the
 * header's split button) only ever touches that interface. When the contract
 * arrives, that hook changes from reading this store to calling
 * `useGet`/`usePost`/`useDelete` against `services.ts`, and nothing else in the
 * feature moves. This store then either becomes a cache or is deleted outright.
 *
 * ── Keyed by merchant ────────────────────────────────────────────────────────
 *
 * A user can hold several MIDs and switch between them without a reload, so a
 * flat list would leak one merchant's templates into another's invoice. The map
 * is keyed by mid for the same reason the server's would be scoped to it.
 *
 * ── Hydration ────────────────────────────────────────────────────────────────
 *
 * `skipHydration` for the reason documented in useProductContext: localStorage
 * is invisible to the server, and anything read from it during the first render
 * makes the client's markup disagree with the server's. The consuming hook
 * calls `rehydrate()` in an effect and reports readiness, so the picker shows
 * its empty state on the first paint in both places and fills in immediately
 * afterwards.
 */
/**
 * What the editor remembers about one draft that the invoice itself cannot hold.
 *
 * Two things, both of which were being silently dropped on reload:
 *
 *  - `templateId`: which template the invoice was built from. Without it the
 *    header falls back from "Update template" to "Save as template", so a
 *    merchant who reopens yesterday's draft and saves it creates a duplicate
 *    template instead of updating the one they started from.
 *  - the four branding fields, which are not on the wire yet. Applying a
 *    template, reloading, and finding the theme back at its default is exactly
 *    the data loss the whole branding block is meant to avoid.
 *
 * Keyed by invoice id, which is globally unique, so this needs no mid nesting.
 * All of it becomes redundant the moment the invoice carries these fields.
 */
export interface DraftMemory {
  templateId: string | null;
  brandingStyleId: string;
  primaryColor: string;
  accentColor: string;
  language: string;
}

interface InvoiceTemplatesState {
  /** mid → that merchant's templates, newest last. */
  templatesByMid: Record<string, InvoiceTemplate[]>;
  /** invoiceId → what the editor remembers about that draft. */
  draftMemory: Record<string, DraftMemory>;

  saveTemplate: (
    mid: string,
    template: {
      id: string;
      name: string;
      description: string;
      savedAt: string;
      snapshot: InvoiceTemplateSnapshot;
    }
  ) => void;
  /**
   * Overwrites an existing template's captured shape, keeping its identity.
   *
   * Takes the description too, because it is derived from the snapshot: leaving
   * the old one behind meant a template that grew from one item to five went on
   * advertising "1 item · EUR" in the picker.
   */
  updateSnapshot: (
    mid: string,
    templateId: string,
    snapshot: InvoiceTemplateSnapshot,
    description: string
  ) => void;
  renameTemplate: (mid: string, templateId: string, name: string) => void;
  deleteTemplate: (mid: string, templateId: string) => void;
  /**
   * Stamps a template as used, so the list can order by recency.
   *
   * Deletes entirely when the API lands: `GET /templates/{id}` bumps
   * `lastUsedAt` as a side effect of the read, so doing it here as well would
   * record two uses for one apply.
   */
  markUsed: (mid: string, templateId: string, atMillis: string) => void;

  rememberDraft: (invoiceId: string, memory: DraftMemory) => void;
}

/** Applies `fn` to one merchant's list, leaving every other merchant untouched. */
function mapMerchant(
  state: InvoiceTemplatesState,
  mid: string,
  fn: (templates: InvoiceTemplate[]) => InvoiceTemplate[]
): Pick<InvoiceTemplatesState, "templatesByMid"> {
  return {
    templatesByMid: {
      ...state.templatesByMid,
      [mid]: fn(state.templatesByMid[mid] ?? []),
    },
  };
}

export const useInvoiceTemplatesStore = create<InvoiceTemplatesState>()(
  persist(
    (set) => ({
      templatesByMid: {},
      draftMemory: {},

      saveTemplate: (mid, template) =>
        set((state) =>
          mapMerchant(state, mid, (templates) => [...templates, { ...template, lastUsedAt: null }])
        ),

      updateSnapshot: (mid, templateId, snapshot, description) =>
        set((state) =>
          mapMerchant(state, mid, (templates) =>
            templates.map((template) =>
              template.id === templateId ? { ...template, snapshot, description } : template
            )
          )
        ),

      renameTemplate: (mid, templateId, name) =>
        set((state) =>
          mapMerchant(state, mid, (templates) =>
            templates.map((template) =>
              template.id === templateId ? { ...template, name } : template
            )
          )
        ),

      deleteTemplate: (mid, templateId) =>
        set((state) =>
          mapMerchant(state, mid, (templates) =>
            templates.filter((template) => template.id !== templateId)
          )
        ),

      markUsed: (mid, templateId, atMillis) =>
        set((state) =>
          mapMerchant(state, mid, (templates) =>
            templates.map((template) =>
              template.id === templateId ? { ...template, lastUsedAt: atMillis } : template
            )
          )
        ),

      rememberDraft: (invoiceId, memory) =>
        set((state) => ({
          draftMemory: { ...state.draftMemory, [invoiceId]: memory },
        })),
    }),
    {
      name: "invoiceTemplates",
      skipHydration: true,
    }
  )
);
