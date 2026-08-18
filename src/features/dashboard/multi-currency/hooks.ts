"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useGet, usePost } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import {
  amzAccountStatementApi,
  amzAccountStatementPollApi,
  mcaAccountConfirmationApi,
  mcaBankStatementApi,
  mcaExchangeRatesApi,
  mcaGeneratedFileApi,
  mcaSendAccountEmailApi,
  mcaShareLinkApi,
  mcaSharedVirtualAccountsApi,
  mcaVirtualAccountsApi,
} from "@/features/dashboard/multi-currency/services";
import { toViewAccounts } from "@/features/dashboard/multi-currency/mapAccounts";
import type {
  AccountDataResponse,
  AmzAccountStatementPollResponse,
  AmzAccountStatementRequest,
  AmzAccountStatementTriggerResponse,
  ExchangeRatesResponse,
  GeneratedDocumentPayload,
  GeneratedDocumentUrlResponse,
  SendAccountEmailRequest,
  ShareLinkRequest,
  ShareLinkResponse,
  VirtualAccount,
} from "@/features/dashboard/multi-currency/types";

/** Which set of accounts a surface wants. The response carries both. */
export type AccountBucket = "general" | "amazon";

/**
 * The MID every endpoint in this feature is scoped to.
 *
 * The explicitly selected MID wins, falling back to the first PACB MID for a
 * merchant who has only one. This mirrors pg-dashboard, whose VirtualAccounts
 * resolves `overrideMid || selectedMid || paCbMids[0]`.
 *
 * Reading `paCbMids[0]` alone — as this did — is wrong for a multi-MID
 * merchant: every one of these endpoints puts a single MID in the request path,
 * so the page silently showed the first account's data no matter which MID was
 * chosen in the header. Because the MID is part of each query key, routing it
 * through here also makes switching accounts refetch on its own.
 *
 * `useResolvedMids("PACB")` remains the wrong tool: it builds an OpenSearch
 * `merchantId` filter across many MIDs, and none of these endpoints take one.
 */
export function useMcaMerchantId(): string {
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);
  const fallbackMid = useApp((s) => s.paCbMids?.[0]) ?? "";
  return selectedMid || fallbackMid;
}

/**
 * Whether this merchant still has to choose a MID before the page can address
 * one. True only for a multi-MID merchant who has not picked yet.
 */
export function useNeedsMidSelection(): boolean {
  const isMultiMidUser = useApp((s) => s.isMultiMidUser);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);
  return isMultiMidUser && !selectedMid;
}

/**
 * Virtual accounts for one bucket.
 *
 * pg-dashboard fetches this with `enabled: false` plus an effect that calls
 * refetch() once the guest flag resolves. That indirection isn't needed here —
 * gating on `enabled` expresses the same thing declaratively, and avoids the
 * setState-in-effect the React Compiler lint plugin rejects (see CLAUDE.md).
 */
export function useVirtualAccounts(bucket: AccountBucket): {
  accounts: VirtualAccount[];
  isLoading: boolean;
  isError: boolean;
} {
  const merchantId = useMcaMerchantId();
  const isGuestUser = useApp((s) => s.isGuestUser);
  const enabled = !!merchantId && isGuestUser === false;

  const { data, isPending, isError } = useGet<AccountDataResponse>(
    ["mca-virtual-accounts", merchantId],
    mcaVirtualAccountsApi(merchantId),
    { enabled }
  );

  return {
    accounts: toViewAccounts(data?.data?.[bucket]),
    // A query that never ran isn't loading. Without the `enabled` guard this
    // would report a permanent skeleton for a guest user.
    isLoading: enabled && isPending,
    isError,
  };
}

/**
 * The same accounts, addressed by public share token instead of a MID — what
 * the page behind a shared link reads. No auth context, so no MID and no guest
 * check.
 */
export function useSharedVirtualAccounts(
  token: string,
  bucket: AccountBucket = "general"
): { accounts: VirtualAccount[]; isLoading: boolean; isError: boolean } {
  const { data, isPending, isError } = useGet<AccountDataResponse>(
    ["mca-shared-virtual-accounts", token],
    mcaSharedVirtualAccountsApi(token),
    { enabled: !!token }
  );

  return {
    accounts: toViewAccounts(data?.data?.[bucket]),
    isLoading: !!token && isPending,
    isError,
  };
}

/** Shareable link for one currency's account details. */
export function useShareLink(): {
  requestShareLink: (currency: string, onUrl: (url: string) => void) => void;
  isRequesting: boolean;
} {
  const merchantId = useMcaMerchantId();
  const { mutate, isPending } = usePost<ShareLinkResponse, ShareLinkRequest>(
    mcaShareLinkApi(merchantId),
    { invalidateQueries: false }
  );

  const requestShareLink = useCallback(
    (currency: string, onUrl: (url: string) => void) => {
      if (!merchantId || !currency) return;
      mutate(
        { currency },
        {
          onSuccess: (response) => {
            const url = response?.data?.url;
            if (url) onUrl(url);
            else toast.error("Couldn't create a share link for this account.");
          },
          onError: (error) => toast.error(error.message || "Couldn't create a share link."),
        }
      );
    },
    [merchantId, mutate]
  );

  return { requestShareLink, isRequesting: isPending };
}

/** Emails one account's details to a client. */
export function useSendAccountEmail(): {
  sendAccountEmail: (payload: SendAccountEmailRequest, onSent: () => void) => void;
  isSending: boolean;
} {
  const merchantId = useMcaMerchantId();
  const { mutate, isPending } = usePost<unknown, SendAccountEmailRequest>(
    mcaSendAccountEmailApi(merchantId),
    { invalidateQueries: false }
  );

  const sendAccountEmail = useCallback(
    (payload: SendAccountEmailRequest, onSent: () => void) => {
      if (!merchantId) return;
      mutate(payload, {
        onSuccess: () => onSent(),
        onError: (error) => toast.error(error.message || "Couldn't send the account details."),
      });
    },
    [merchantId, mutate]
  );

  return { sendAccountEmail, isSending: isPending };
}

// ── Generated document downloads ────────────────────────────────────────────
// Proof of account ownership and the bank settlement statement are the same
// two-leg flow, differing only in the leg-1 URL:
//
//   leg 1  GET  account-confirmation|bank-statement/{accountId}
//               -> { fileName, processor, isAmazon, documentType }
//   leg 2  POST account-generated-file with that descriptor, repeatedly, until
//               the response carries a `url`. Generation is asynchronous.
//
// Both legs are modelled as pg-dashboard models them: leg 1 a disabled query
// driven by refetch() (the request is an imperative command, not page state),
// leg 2 a mutation called in a loop.

/** Which document to generate. Also the descriptor's own `documentType`, but
 *  that value comes back from leg 1 rather than being sent. */
export type AccountDocumentKind = "proof-of-ownership" | "bank-statement";

/** One queued document request. `nonce` makes a repeat request for the same
 *  account a distinct query key, so it refetches instead of replaying a cached
 *  (by then expired) URL. */
interface DocumentJob {
  accountId: string;
  nonce: number;
}

/** One queued statement poll, keyed by the timestamp leg 1 returned. */
interface StatementJob {
  requestTimestamp: string;
  nonce: number;
}

const MAX_POLL_ATTEMPTS = 15;
const POLL_INTERVAL_MS = 2000;

/**
 * Downloads one of the generated account documents.
 *
 * `accountId` is the SHA-256 hash of the account number, which is how both
 * endpoints identify an account — see `accountDocumentId` in this feature's
 * utils. The hash is computed by the caller and never logged: the account
 * number itself must not appear in a URL, a query key, or an error message.
 */
export function useAccountDocumentDownload(kind: AccountDocumentKind): {
  download: (accountId: string) => void;
  isDownloading: boolean;
} {
  const merchantId = useMcaMerchantId();
  const [job, setJob] = useState<DocumentJob | null>(null);
  const jobCounter = useRef(0);

  const initiateUrl =
    kind === "proof-of-ownership"
      ? mcaAccountConfirmationApi(merchantId, job?.accountId ?? "")
      : mcaBankStatementApi(merchantId, job?.accountId ?? "");

  const { refetch: initiate } = useGet<{ data?: GeneratedDocumentPayload }>(
    ["mca-account-document", kind, merchantId, job?.accountId, job?.nonce],
    initiateUrl,
    { enabled: false }
  );

  const { mutateAsync: pollGeneratedFile } = usePost<
    { data?: GeneratedDocumentUrlResponse },
    GeneratedDocumentPayload
  >(mcaGeneratedFileApi(merchantId), { invalidateQueries: false });

  // The work runs in an effect rather than inside `download`, and that ordering
  // is load-bearing: `initiateUrl` is built from `job`, so refetching in the
  // same tick as the setState would fetch the URL from the *previous* render —
  // an empty one on the first click. The effect runs after the render that
  // committed the job, so refetch() sees the right URL.
  useEffect(() => {
    if (!job) return;

    const run = async (): Promise<void> => {
      try {
        const initiated = await initiate();
        const descriptor = initiated?.data?.data;

        // All four fields are required by leg 2. pg-dashboard treats a missing
        // one as a hard failure rather than posting a partial descriptor.
        if (
          !descriptor?.fileName ||
          !descriptor?.processor ||
          !descriptor?.isAmazon ||
          !descriptor?.documentType
        ) {
          throw new Error("Couldn't start generating this document.");
        }

        for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
          const polled = await pollGeneratedFile(descriptor);
          const url = polled?.data?.url;

          if (url) {
            window.open(url, "_blank", "noopener,noreferrer");
            return;
          }

          if (attempt < MAX_POLL_ATTEMPTS - 1) {
            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
          }
        }

        toast.error("This document is taking longer than expected. Please try again in a bit.");
      } catch (error) {
        const message = (error as { message?: string })?.message;
        toast.error(message || "Couldn't download this document.");
      } finally {
        setJob(null);
      }
    };

    void run();
  }, [job, initiate, pollGeneratedFile]);

  const download = useCallback(
    (accountId: string): void => {
      if (!merchantId || !accountId) return;
      // A counter rather than a timestamp: Date.now() is barred during render
      // (CLAUDE.md) and a monotonic id is all the query key needs to treat a
      // repeat request for the same document as a fresh fetch.
      jobCounter.current += 1;
      setJob({ accountId, nonce: jobCounter.current });
    },
    [merchantId]
  );

  return { download, isDownloading: job !== null };
}

/**
 * The Amazon account-detail statement: a PDF ops generates from the account
 * details the merchant confirms in the drawer.
 *
 * Same two-leg shape as the documents above, but leg 1 is a POST carrying the
 * details and leg 2 polls a URL keyed by the `requestTimestamp` it returns.
 * pg-dashboard polls this every 2s and gives up after 30s; MAX_POLL_ATTEMPTS x
 * POLL_INTERVAL_MS is the same 30s here.
 */
export function useAmzAccountStatement(): {
  requestStatement: (payload: AmzAccountStatementRequest) => Promise<void>;
  isWorking: boolean;
} {
  const merchantId = useMcaMerchantId();
  const [job, setJob] = useState<StatementJob | null>(null);
  const jobCounter = useRef(0);

  const { mutateAsync: triggerStatement, isPending: isTriggering } = usePost<
    AmzAccountStatementTriggerResponse,
    AmzAccountStatementRequest
  >(amzAccountStatementApi(merchantId), { invalidateQueries: false });

  const { refetch: pollStatement } = useGet<AmzAccountStatementPollResponse>(
    ["amz-account-statement", merchantId, job?.requestTimestamp, job?.nonce],
    amzAccountStatementPollApi(merchantId, job?.requestTimestamp ?? ""),
    { enabled: false }
  );

  // Effect-driven for the same reason as above: the poll URL is built from the
  // committed job, not from whatever was in scope when the POST resolved.
  useEffect(() => {
    if (!job) return;

    const run = async (): Promise<void> => {
      try {
        for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
          const polled = await pollStatement();
          const url = polled?.data?.data?.presignedUrl;

          if (url) {
            window.open(url, "_blank", "noopener,noreferrer");
            return;
          }

          if (attempt < MAX_POLL_ATTEMPTS - 1) {
            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
          }
        }

        toast.error("This statement is taking longer than expected. Please try again in a bit.");
      } finally {
        setJob(null);
      }
    };

    void run();
  }, [job, pollStatement]);

  const requestStatement = useCallback(
    async (payload: AmzAccountStatementRequest): Promise<void> => {
      if (!merchantId) return;

      try {
        const triggered = await triggerStatement(payload);
        const requestTimestamp = triggered?.data?.requestTimestamp;

        if (!requestTimestamp) {
          toast.error(
            triggered?.message ||
              "The statement was requested but the server didn't say when it would be ready."
          );
          return;
        }

        jobCounter.current += 1;
        setJob({ requestTimestamp, nonce: jobCounter.current });
      } catch (error) {
        const message = (error as { message?: string })?.message;
        toast.error(message || "Couldn't request this statement.");
      }
    },
    [merchantId, triggerStatement]
  );

  return { requestStatement, isWorking: isTriggering || job !== null };
}

/**
 * Live FX rate for a currency/amount pair.
 *
 * `amount` must already be debounced by the caller — it lands in the URL, so
 * every keystroke would otherwise be its own request. pg-dashboard debounces
 * by 450ms in FxCalculatorModal.
 */
export function useExchangeRates(
  currency: string,
  amount: number
): {
  rates: ExchangeRatesResponse["data"] | undefined;
  /** True only before the first quote arrives — there is nothing to show yet. */
  isLoading: boolean;
  /** True while a *replacement* quote is in flight, with the previous one still
   *  on screen. */
  isUpdating: boolean;
  isError: boolean;
} {
  const merchantId = useMcaMerchantId();
  const enabled = !!merchantId && !!currency && amount >= 0;

  const { data, isPending, isFetching, isError } = useGet<ExchangeRatesResponse>(
    ["mca-exchange-rates", merchantId, currency, amount],
    mcaExchangeRatesApi(merchantId, currency, amount),
    {
      enabled,
      // Every amount and currency is its own query key, so without this the
      // figures would blank out on each keystroke while the new key loads and
      // the calculator would flicker between numbers and placeholders. Holding
      // the previous quote is what pg-dashboard does with its own
      // `lastSuccessRef`; react-query expresses the same thing directly.
      placeholderData: (previous) => previous,
    }
  );

  return {
    rates: data?.data,
    isLoading: enabled && isPending,
    isUpdating: enabled && isFetching,
    isError,
  };
}
