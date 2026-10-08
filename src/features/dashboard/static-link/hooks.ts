"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useGet, usePostQuery, usePut } from "@/lib/api/hooks";
import { buildTxnRequestBody } from "@/lib/utils/buildTxnRequestBody";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import {
  STATIC_LINK_QUERY_KEY,
  STATIC_LINK_SEARCH_PAGE_LIMIT,
  STATIC_LINK_SEARCH_QUERY_KEY,
} from "@/features/dashboard/static-link/constants";
import {
  readStaticLink,
  readStaticLinkRow,
  sanitizeStaticLinkHandle,
  toLinkFromSearchRow,
} from "@/features/dashboard/static-link/helpers";
import {
  staticLinkApi,
  staticLinkConfigApi,
  staticLinkSearchApi,
  staticLinkStatusApi,
} from "@/features/dashboard/static-link/services";
import type {
  StaticLinkDisplayFieldsRequest,
  StaticLinkProductData,
  StaticLinkResponse,
  StaticLinkSearchResponse,
  StaticLinkStatusRequest,
} from "@/features/dashboard/static-link/types";
import type { TableReqBody } from "@/types/transactions";

/**
 * The Card Payments (PA) MID the no-code calls are addressed by, pg-dashboard's
 * usePaMerchantId: the header's selection, if it is a PA MID, else the first PA
 * MID. Empty when the merchant has no PA account, or has picked one that is not
 * PA: the MID is a path segment, so a wrong one comes back 404 rather than
 * empty, and `profile.mid` (the UCIC id on a portfolio account) is never used.
 */
export function useStaticLinkMid(): string {
  const paMids = useApp((s) => s.paMids);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);
  if (selectedMid) return paMids.includes(selectedMid) ? selectedMid : "";
  return paMids[0] ?? "";
}

interface UseStaticLinkResult {
  merchantId: string;
  link: StaticLinkProductData | null;
  isLoading: boolean;
  isSaving: boolean;
  /** First activation, carrying the one-time custom handle. */
  activateWithHandle: (handle: string) => void;
  /** Merges display fields by `fieldKey`. Send only what changed. */
  saveDisplayFields: (body: StaticLinkDisplayFieldsRequest) => void;
}

/**
 * Owns the merchant-facing no-code calls for Static Link, ported from
 * pg-dashboard's useStaticLink: finding the link, reading it, the display
 * fields write, and the first activation with a custom handle.
 *
 * The admin calls (`POST /no-code/admin/{mid}/STATIC_LINK` and its enablement
 * sibling) are glocal admin/ops only, so nothing here can create a link, only
 * edit one already provisioned.
 */
export function useStaticLink(): UseStaticLinkResult {
  const merchantId = useStaticLinkMid();

  // Every call below is addressed by product id, which is server-generated
  // from the merchant's shortname, so it is looked up first.
  //
  // Search is not scoped by the path MID (it returns every link in the
  // portfolio), so the merchant is narrowed in the body, keyed `mid`: a
  // `merchantId` key returns nothing on this index.
  // pg-dashboard's builder also sends an empty `fieldOrSearch`, so it is
  // added to match the request exactly.
  const searchBody: TableReqBody = {
    ...buildTxnRequestBody(
      {},
      {
        pageLimit: STATIC_LINK_SEARCH_PAGE_LIMIT,
        selectedMid: { key: "mid", value: [merchantId] },
      }
    ),
    fieldOrSearch: {},
  };
  const {
    data: searchResponse,
    isFetching: isFindingLink,
    refetch: refetchSearch,
  } = usePostQuery<StaticLinkSearchResponse, TableReqBody>(
    [...STATIC_LINK_SEARCH_QUERY_KEY, merchantId],
    merchantId ? staticLinkSearchApi(merchantId) : "",
    searchBody,
    undefined,
    Boolean(merchantId)
  );

  // Customizing the handle renames the link: the server writes a new row under
  // the new id and deletes the old one, so the new id is held here and wins
  // from then on (it is in every query key below, so the link refetches).
  const [renamedProductId, setRenamedProductId] = useState<string | null>(null);
  const searchRow = useMemo(() => readStaticLinkRow(searchResponse), [searchResponse]);
  const productId = renamedProductId ?? searchRow?.productId ?? "";
  const canCall = Boolean(merchantId && productId);

  // Never activated: the name is still the merchant's to choose, and the
  // get-by-id read 404s, so it waits.
  const isDraft = !renamedProductId && searchRow?.status === "DRAFT";

  const {
    data: linkResponse,
    isFetching,
    refetch: refetchLink,
  } = useGet<StaticLinkResponse>(
    [...STATIC_LINK_QUERY_KEY, merchantId, productId],
    canCall ? staticLinkApi(merchantId, productId) : "",
    undefined,
    { enabled: canCall && !isDraft }
  );

  // The full read, or the search summary while the link is a draft. The
  // fallback stops there on purpose: search is entity-wide, so falling back on
  // a get-by-id 404 could show a sibling MID's link as this merchant's.
  const link = useMemo(
    () =>
      readStaticLink(linkResponse) ?? (isDraft ? toLinkFromSearchRow(searchRow, merchantId) : null),
    [linkResponse, searchRow, merchantId, isDraft]
  );

  const { mutate: updateStatus, isPending: isStatusSaving } = usePut<
    StaticLinkResponse,
    StaticLinkStatusRequest
  >(canCall ? staticLinkStatusApi(merchantId, productId) : "", { invalidateQueries: false });

  const { mutate: updateDisplayFields, isPending: isFieldsSaving } = usePut<
    StaticLinkResponse,
    StaticLinkDisplayFieldsRequest
  >(canCall ? staticLinkConfigApi(merchantId, productId) : "", { invalidateQueries: false });

  /**
   * Activates the link for the first time under a handle of the merchant's
   * choosing: the only call that may carry `handle`, and the only chance to
   * set one (the server locks it the moment this succeeds). `enabled: true`
   * is what opens the rename window server-side.
   */
  const activateWithHandle = (handle: string): void => {
    if (!canCall) return;
    const requested = sanitizeStaticLinkHandle(handle);
    updateStatus(
      { enabled: true, handle: requested },
      {
        onSuccess: (response) => {
          // The link now lives under a new id; the server's wins, the
          // requested one is only a fallback for a response that omits it.
          setRenamedProductId(readStaticLink(response)?.productId ?? requested);
          void refetchSearch();
          toast.success("Your link name is set");
        },
        // Carries the server's own wording for a taken handle, the one case
        // the merchant has to act on.
        onError: (error) =>
          toast.error("Couldn't set that link name", { description: error?.message }),
      }
    );
  };

  const saveDisplayFields = (body: StaticLinkDisplayFieldsRequest): void => {
    if (!canCall) return;
    updateDisplayFields(body, {
      onSuccess: () => {
        toast.success("Saved what you collect from customers");
        void refetchLink();
      },
      onError: (error) =>
        toast.error("Couldn't save your changes", { description: error?.message }),
    });
  };

  return {
    merchantId,
    link,
    isLoading: isFindingLink || isFetching,
    isSaving: isStatusSaving || isFieldsSaving,
    activateWithHandle,
    saveDisplayFields,
  };
}
