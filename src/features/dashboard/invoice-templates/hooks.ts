"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useDelete, useGet, usePost, usePut } from "@/lib/api/hooks";
import { useInvoiceMerchantId } from "@/features/dashboard/create-invoice/hooks";
import {
  fromApiTemplate,
  isNameTakenIn,
  suggestCopyNameFor,
  toTemplateWriteBody,
} from "@/features/dashboard/invoice-templates/helpers";
import { NEW_TEMPLATE_ID } from "@/features/dashboard/invoice-templates/constants";
import {
  invoiceTemplateApi,
  invoiceTemplatesApi,
} from "@/features/dashboard/invoice-templates/services";
import type { BaseResponse } from "@/types/common";
import type {
  InvoiceTemplate,
  InvoiceTemplateSnapshot,
  TemplateListResponse,
  TemplateResponse,
  TemplateWriteBody,
  TemplateWriteResponse,
} from "@/features/dashboard/invoice-templates/types";

/** Convenience wrapper so callers can type the envelope without repeating it. */
export type SimpleResponse = BaseResponse<Record<string, unknown>>;
// ─── Templates ────────────────────────────────────────────────────────────────

export interface InvoiceTemplates {
  templates: InvoiceTemplate[];
  /** False while the list is loading, so the picker can shimmer. */
  isReady: boolean;
  /**
   * True while the list is being refetched, including in the background.
   *
   * `isReady` alone cannot answer "is this id genuinely gone?": every mutation
   * invalidates the list, and during that refetch `isLoading` is false while
   * the cache still holds the PREVIOUS list. A freshly created template is
   * therefore absent-but-not-missing for a moment, which is exactly when the
   * editor navigates to it.
   */
  isFetching: boolean;
  /** True while any create, update, rename or delete is in flight. */
  isMutating: boolean;
  /**
   * The template a mutation is currently in flight for, or null.
   *
   * Row actions gate on this rather than on `isMutating`, so deleting one
   * template no longer greys out the actions on every other one. `isMutating`
   * stays for the two dialogs that only ever act on a single template at a
   * time.
   */
  mutatingId: string | null;
  /**
   * Creates one. The server mints the id, so it arrives in `onSaved` rather than
   * being returned — the caller needs it to link the invoice to the new template.
   */
  save: (name: string, snapshot: InvoiceTemplateSnapshot, onSaved: (id: string) => void) => void;
  /** Full replace, keeping the name. */
  update: (templateId: string, snapshot: InvoiceTemplateSnapshot) => void;
  /** Also a full replace: the API has no rename endpoint. */
  rename: (templateId: string, name: string) => void;
  /**
   * Replaces name AND contents in one request.
   *
   * The template editor changes both at once, and `rename` + `update` would be
   * two full-body PUTs racing each other: each builds its body from the CACHED
   * template, so whichever landed second would undo the other's half. One
   * request, one body, both changes.
   */
  replace: (
    templateId: string,
    name: string,
    snapshot: InvoiceTemplateSnapshot,
    onSaved?: () => void
  ) => void;
  remove: (templateId: string) => void;
  /**
   * Copies one, under a name the caller picks.
   *
   * A POST of the existing snapshot: no new endpoint, and the same write body
   * builder as `save`. Duplicating is the operation a merchant actually reaches
   * for when they want "the retainer, but at the new rate", and without it the
   * only route is applying a template to a throwaway invoice and saving that.
   */
  duplicate: (templateId: string, onSaved?: (id: string) => void) => void;
  /** True when another template already answers to this name. */
  isNameTaken: (name: string, exceptId?: string | null) => boolean;
  /** "Retainer" → "Retainer (2)", skipping names already in use. */
  suggestCopyName: (name: string) => string;
  /**
   * Records that a template was used.
   *
   * Implemented as a read of `/templates/{id}`, because bumping `lastUsedAt` is
   * that endpoint's documented side effect and there is no other way to signal
   * it. The response is discarded: the list already carries full templates, so
   * the merchant's invoice is filled in from the row they clicked and this only
   * moves the template up the list next time.
   */
  markUsed: (templateId: string) => void;
}

/**
 * Saved invoice templates, from the API.
 *
 * This hook is the whole of the feature's template storage: the picker card, the
 * save dialog, the manage dialog and the header's split button all go through
 * it and none of them knows where a template lives. It used to be backed by a
 * persisted zustand store, because the endpoints did not exist; that store is
 * deleted, and nothing about templates touches localStorage any more.
 *
 * Every mutation invalidates the list rather than patching a local copy, so what
 * the picker shows is always what the server holds — including `savedAt` and
 * `lastUsedAt`, which only it can supply.
 */
export function useInvoiceTemplates(): InvoiceTemplates {
  const merchantId = useInvoiceMerchantId();
  const queryClient = useQueryClient();

  const listKey = useMemo(() => ["invoice-templates", merchantId], [merchantId]);
  const listUrl = invoiceTemplatesApi(merchantId);

  const { data, isLoading, isFetching } = useGet<TemplateListResponse>(
    listKey,
    listUrl,
    undefined,
    { enabled: !!listUrl }
  );

  const invalidateList = useCallback(
    () => void queryClient.invalidateQueries({ queryKey: listKey }),
    [queryClient, listKey]
  );

  /**
   * Most recently used first, then most recently saved.
   *
   * Sorted here because the list endpoint promises no order, and because recency
   * is what a picker wants: the template a merchant reaches for weekly would
   * otherwise sink as they add others.
   */
  const templates = useMemo(() => {
    const mapped = (data?.data?.templates ?? []).map(fromApiTemplate);
    return mapped.sort((a, b) => {
      const used = Number(b.lastUsedAt ?? 0) - Number(a.lastUsedAt ?? 0);
      return used !== 0 ? used : Number(b.savedAt ?? 0) - Number(a.savedAt ?? 0);
    });
  }, [data]);

  const { mutate: create, isPending: isCreating } = usePost<
    TemplateWriteResponse,
    TemplateWriteBody
  >(listUrl, { invalidateQueries: false });

  // One hook each for PUT and DELETE, addressed per call through `dynamicUrl`:
  // the template id is only known at click time, and useApiMutation resolves
  // `dynamicUrl` over the hook's own url for exactly this case.
  const { mutate: replace, isPending: isReplacing } = usePut<
    TemplateWriteResponse,
    { dynamicUrl: string; reqBody: TemplateWriteBody }
  >("", { invalidateQueries: false });

  const { mutate: destroy, isPending: isDeleting } = useDelete<
    SimpleResponse,
    { dynamicUrl: string }
  >("", { invalidateQueries: false });

  /**
   * Which template a request is currently in flight for.
   *
   * The three mutation hooks each expose one boolean for "something is
   * happening", which was enough while every caller acted on a single template
   * at a time. The templates list shows every template at once, so it needs to
   * know *which* — otherwise deleting one row disables the actions on all of
   * them. Creation has no id yet and reports the sentinel below.
   */
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const settle = useCallback(() => setMutatingId(null), []);

  const save = useCallback(
    (name: string, snapshot: InvoiceTemplateSnapshot, onSaved: (id: string) => void) => {
      setMutatingId(NEW_TEMPLATE_ID);
      create(toTemplateWriteBody(name, snapshot), {
        onSuccess: (response) => {
          settle();
          invalidateList();
          const templateId = response?.data?.templateId;
          if (templateId) onSaved(templateId);
        },
        onError: (error) => {
          settle();
          toast.error("Couldn't save the template", { description: error.message });
        },
      });
    },
    [create, invalidateList, settle]
  );

  /**
   * Copies a template's snapshot under a new name.
   *
   * Nothing but `save` with the stored snapshot instead of the live form, which
   * is the whole point: no second write path, and the copy is byte-identical to
   * what the original would produce.
   */
  const duplicate = useCallback(
    (templateId: string, onSaved?: (id: string) => void) => {
      const existing = templates.find((template) => template.id === templateId);
      if (!existing) return;
      save(suggestCopyNameFor(existing.name, templates), existing.snapshot, (id) => onSaved?.(id));
    },
    [templates, save]
  );

  /** PUT takes the same body as POST, so both write paths share one builder. */
  const put = useCallback(
    (
      templateId: string,
      name: string,
      snapshot: InvoiceTemplateSnapshot,
      failure: string,
      onSaved?: () => void
    ) => {
      setMutatingId(templateId);
      replace(
        {
          dynamicUrl: invoiceTemplateApi(merchantId, templateId),
          reqBody: toTemplateWriteBody(name, snapshot),
        },
        {
          onSuccess: () => {
            settle();
            invalidateList();
            onSaved?.();
          },
          onError: (error) => {
            settle();
            toast.error(failure, { description: error.message });
          },
        }
      );
    },
    [replace, merchantId, invalidateList, settle]
  );

  const replaceTemplate = useCallback(
    (templateId: string, name: string, snapshot: InvoiceTemplateSnapshot, onSaved?: () => void) =>
      put(templateId, name, snapshot, "Couldn't save the template", onSaved),
    [put]
  );

  const update = useCallback(
    (templateId: string, snapshot: InvoiceTemplateSnapshot) => {
      const existing = templates.find((template) => template.id === templateId);
      if (!existing) return;
      put(templateId, existing.name, snapshot, "Couldn't update the template");
    },
    [templates, put]
  );

  /**
   * Renaming is a full replace of the template's contents with a new name, since
   * the API exposes no rename. The snapshot therefore has to come from the list,
   * which is why this cannot be issued for a template that is not in it.
   */
  const rename = useCallback(
    (templateId: string, name: string) => {
      const existing = templates.find((template) => template.id === templateId);
      if (!existing) return;
      put(templateId, name, existing.snapshot, "Couldn't rename the template");
    },
    [templates, put]
  );

  const remove = useCallback(
    (templateId: string) => {
      setMutatingId(templateId);
      destroy(
        { dynamicUrl: invoiceTemplateApi(merchantId, templateId) },
        {
          onSuccess: () => {
            settle();
            invalidateList();
          },
          onError: (error) => {
            settle();
            toast.error("Couldn't delete the template", { description: error.message });
          },
        }
      );
    },
    [destroy, merchantId, invalidateList, settle]
  );

  /**
   * The read that records a use.
   *
   * A disabled query plus an explicit refetch, the same idiom mca-transactions
   * uses for its presigned-URL downloads: the id is only known at click time, so
   * it goes into state, and the fetch runs from the effect's async callback
   * rather than the effect body. Failure is silent by design — the invoice has
   * already been filled in, and "couldn't record that you used this template" is
   * not something to interrupt a merchant with.
   */
  const [pendingUseId, setPendingUseId] = useState<string | null>(null);

  const { refetch: readTemplate } = useGet<TemplateResponse>(
    ["invoice-template", merchantId, pendingUseId],
    pendingUseId ? invoiceTemplateApi(merchantId, pendingUseId) : "",
    undefined,
    { enabled: false, staleTime: 0 }
  );

  useEffect(() => {
    if (!pendingUseId) return;

    const run = async (): Promise<void> => {
      await readTemplate();
      setPendingUseId(null);
      // The bump only shows up in the list, which this hook holds.
      void queryClient.invalidateQueries({ queryKey: listKey });
    };

    void run();
  }, [pendingUseId, readTemplate, queryClient, listKey]);

  const isNameTaken = useCallback(
    (name: string, exceptId?: string | null) => isNameTakenIn(name, templates, exceptId),
    [templates]
  );

  const suggestCopyName = useCallback(
    (name: string) => suggestCopyNameFor(name, templates),
    [templates]
  );

  return {
    templates,
    mutatingId,
    duplicate,
    replace: replaceTemplate,
    isNameTaken,
    suggestCopyName,
    isReady: !isLoading,
    isFetching,
    isMutating: isCreating || isReplacing || isDeleting,
    save,
    update,
    rename,
    remove,
    markUsed: setPendingUseId,
  };
}
