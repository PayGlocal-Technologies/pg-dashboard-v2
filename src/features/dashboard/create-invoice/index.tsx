"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button, Shimmer, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { useGet, usePost } from "@/lib/api/hooks";
import {
  billerDetailsApi,
  createInvoiceApi,
  generateInvoiceApi,
  getInvoiceDetailsApi,
  skuImportPreviousItemsApi,
} from "@/features/dashboard/create-invoice/services";
import {
  useDebouncedAutosave,
  useInvoiceBankAccounts,
  useInvoiceClients,
  useInvoiceMerchantId,
  useInvoiceAsset,
  useLinkedTransaction,
  useMcaCurrencies,
} from "@/features/dashboard/create-invoice/hooks";
import {
  getInvoiceTotals,
  hasCompleteLineItems,
  toFormState,
  toInvoicePayload,
  validateSelectedClient,
} from "@/features/dashboard/create-invoice/helpers";
import { AUTOSAVE_DEBOUNCE_MS } from "@/features/dashboard/create-invoice/constants";
import {
  DueDateChip,
  InvoiceNumberChip,
  IssueDateChip,
  dueDateForTerm,
  toDateKey,
} from "@/features/dashboard/create-invoice/components/InvoiceHeaderChips";
import { BillerSection } from "@/features/dashboard/create-invoice/components/BillerSection";
import { BillToSection } from "@/features/dashboard/create-invoice/components/BillToSection";
import { LineItemsSection } from "@/features/dashboard/create-invoice/components/LineItemsSection";
import { PaymentDetailsSection } from "@/features/dashboard/create-invoice/components/PaymentDetailsSection";
import { NotesAndTermsSection } from "@/features/dashboard/create-invoice/components/NotesAndTermsSection";
import { RecurringSection } from "@/features/dashboard/create-invoice/components/RecurringSection";
import { ConsentSection } from "@/features/dashboard/create-invoice/components/ConsentSection";
import { BrandingSection } from "@/features/dashboard/create-invoice/components/BrandingSection";
import { LinkedTransactionChip } from "@/features/dashboard/create-invoice/components/LinkedTransactionChip";
import { InvoicePreviewSidebar } from "@/features/dashboard/create-invoice/components/preview/InvoicePreviewSidebar";
import { CreateInvoiceSuccess } from "@/features/dashboard/create-invoice/components/success";
import type {
  BillerDetails,
  BillerDetailsResponse,
  CurrencyData,
  InvoiceCreatePayload,
  InvoiceData,
  InvoiceDetailsResponse,
  InvoiceFormState,
} from "@/features/dashboard/create-invoice/types";
import type { BaseResponse } from "@/types/common";

interface SkuImportRequest {
  items: {
    name: string;
    type: string | null;
    hsnSac: string;
    unitPrice: string;
    currency: string | null;
    description: null;
  }[];
}

/** How long the editor waits before admitting bootstrap has stalled. */
const BOOTSTRAP_STALL_MS = 8000;

function emptyForm(today: string, currency: string): InvoiceFormState {
  return {
    invoiceNumber: "",
    invoiceDate: today,
    dueDate: "",
    dueTermId: null,
    clientId: "",
    currency,
    lineItems: [],
    discountName: "",
    discountValue: "",
    discountType: "percentage",
    taxName: "",
    taxValue: "",
    accountNo: "",
    memo: "",
    notes: "",
    lut: "",
    logoEnabled: false,
    signatureEnabled: false,
    isRecurring: false,
    recurringType: "",
    recurringStartDate: "",
    userCreateConsent: false,
  };
}

/**
 * The editor's own geometry, greyed.
 *
 * Renders the real header and the real two-column grid, with shimmer standing
 * in only for content that has to be fetched. The page therefore has its final
 * shape from the first frame and nothing jumps when the data lands, instead of
 * the previous three blocks floating in a narrow centred column that looked
 * nothing like where they were going.
 *
 * Close is genuinely wired: a merchant who lands here and changes their mind
 * should not have to wait for a network round-trip to leave.
 */
function EditorSkeleton({ onClose }: { onClose: () => void }) {
  return (
    <>
      <header className="flex shrink-0 flex-wrap items-center gap-4 border-b border-border px-5 py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Close"
          className="h-9 w-9 shrink-0 p-0"
          onClick={onClose}
        >
          <Icon name="x" className="h-4 w-4" />
        </Button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Create a new invoice
            </h1>
            <StatusBadge variant="muted" label="Draft" size="sm" />
          </div>
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled
          leftIcon={<Icon name="file-text" className="h-3.5 w-3.5" />}
        >
          Generate invoice
        </Button>
      </header>

      <div
        aria-busy
        aria-label="Preparing your invoice"
        className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_40rem]"
      >
        <div className="min-h-0 overflow-y-auto">
          <div className="mx-auto max-w-[860px] space-y-5 px-6 py-6 lg:px-10">
            {/* The number / issue-date / due-date chip row. */}
            <div className="flex flex-wrap items-center gap-2">
              <Shimmer className="h-8 w-36 rounded-full" />
              <Shimmer className="h-8 w-32 rounded-full" />
              <Shimmer className="h-8 w-28 rounded-full" />
            </div>

            {/* One block per section card, at roughly their real heights. */}
            <Shimmer className="h-44 w-full rounded-xl" />
            <Shimmer className="h-40 w-full rounded-xl" />
            <Shimmer className="h-64 w-full rounded-xl" />
            <Shimmer className="h-48 w-full rounded-xl" />
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto bg-muted">
          <div className="space-y-4 p-4 md:p-6">
            <div className="flex items-center justify-between">
              <Shimmer className="h-4 w-20" />
              <Shimmer className="h-8 w-40 rounded-lg" />
            </div>
            <Shimmer className="h-[32rem] w-full rounded-2xl" />
            <Shimmer className="h-14 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Create an invoice.
 *
 * Nova's single-page editor, backed by pg-dashboard's API. The wizard is gone;
 * every section is visible at once and the draft is persisted by a debounced
 * POST to the same create endpoint the six-step flow uses, with `currentStep`
 * derived from how far the form has actually been filled. That keeps a draft
 * started here resumable over in pg-dashboard.
 *
 * This outer component does the loading. It owns nothing editable: once the
 * draft, the biller profile and the currency list have all arrived it mounts
 * <InvoiceEditor> keyed on the invoice id, which seeds its form state from
 * those props in useState initializers. Copying fetched data into state from an
 * effect instead would cascade renders on every load.
 */
export function CreateInvoiceFeature() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const merchantId = useInvoiceMerchantId();

  const gid = searchParams.get("gid") ?? "";
  const clientIdParam = searchParams.get("clientId") ?? "";
  const status = searchParams.get("status") ?? "";

  // The hook-level mutation callbacks below outlive any single render, so they
  // read through refs rather than capturing stale values. Written in an effect,
  // never during render, and only ever read after a network round-trip.
  const gidRef = useRef(gid);
  const routerRef = useRef(router);
  const creatingRef = useRef(false);
  useEffect(() => {
    gidRef.current = gid;
    routerRef.current = router;
  });

  // Lazy initializer: `new Date()` must not run on every render.
  const [today] = useState(() => toDateKey(new Date()));
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  /** Set by a timer once bootstrap has clearly stalled. See the panel below. */
  const [isStalled, setIsStalled] = useState(false);

  const { currencies, symbolFor, isError: currenciesFailed } = useMcaCurrencies();

  /**
   * Draft creation.
   *
   * The handlers live in the hook options, NOT on the `mutate()` call.
   * TanStack drops per-call callbacks if the component unmounts before the
   * mutation settles; hook-level ones always run. `history.replaceState` then
   * writes the id to the address bar without involving the router, so a
   * remount can read it straight back off the URL.
   */
  const {
    mutate: createDraft,
    data: createResponse,
    status: createStatus,
    error: createError,
  } = usePost<InvoiceDetailsResponse, InvoiceCreatePayload>(createInvoiceApi(merchantId), {
    invalidateQueries: false,
    onSuccess: (response) => {
      const newId = response?.data?.invoiceId ?? response?.data?.invoice?.id;
      if (!newId) {
        creatingRef.current = false;
        setBootstrapError(
          "The invoice was created but the server did not return its id. It is saved in your drafts."
        );
        return;
      }

      const params = new URLSearchParams({ invoiceId: newId });
      if (gidRef.current) params.set("gid", gidRef.current);
      const nextUrl = `/create-invoice?${params.toString()}`;

      if (typeof window !== "undefined") window.history.replaceState(null, "", nextUrl);
      routerRef.current.replace(nextUrl, { scroll: false });
    },
    onError: (error) => {
      creatingRef.current = false;
      setBootstrapError(error.message || "Couldn't start the invoice.");
      toast.error("Couldn't start the invoice", { description: error.message });
    },
  });

  /**
   * The draft's id, read from the URL or straight off the create response.
   *
   * Previously this came only from the URL, which made the whole page depend on
   * `router.replace()` landing — a query-only navigation on the same pathname,
   * which App Router does not reliably surface back through useSearchParams.
   * When it did not land, the id was never seen, the details query stayed
   * disabled, and the editor waited forever on a draft that already existed on
   * the server.
   *
   * Reading react-query's own mutation result removes two dependencies at once:
   * the router does not have to navigate, and `onSuccess` does not have to
   * fire. The URL is still synced afterwards, but only so a refresh or a copied
   * link reopens the same draft — nothing waits on it.
   */
  const createdInvoiceId =
    createResponse?.data?.invoiceId ?? createResponse?.data?.invoice?.id ?? "";
  const invoiceId = searchParams.get("invoiceId") || createdInvoiceId;

  const detailsUrl = getInvoiceDetailsApi(merchantId, invoiceId);
  const {
    data: detailsData,
    isError: detailsFailed,
    status: detailsStatus,
    fetchStatus: detailsFetchStatus,
  } = useGet<InvoiceDetailsResponse>(
    ["invoice-details", merchantId, invoiceId],
    detailsUrl,
    undefined,
    { enabled: !!detailsUrl }
  );

  const billerUrl = billerDetailsApi(merchantId);
  const {
    data: billerData,
    isError: billerFailed,
    status: billerStatus,
    fetchStatus: billerFetchStatus,
  } = useGet<BillerDetailsResponse>(["biller-details", merchantId], billerUrl, undefined, {
    enabled: !!billerUrl,
  });

  // Without an invoiceId there is no draft to autosave into, and the server owns
  // the invoice number, so one is created up front rather than on first edit.
  // The ref keeps it to a single call under StrictMode's double-invoke.
  useEffect(() => {
    // The draft must be created already carrying a currency, so creation waits
    // for the currency list. get-suggested-account resolves the account from
    // the invoice's OWN stored currency and rejects a draft without one
    // ("Missing currency from invoice"). Production never hits that: its wizard
    // persists the ITEMS step, which carries the currency, long before the Bank
    // step runs. This editor renders every section at once and asks for the
    // accounts as soon as the draft exists, so the currency has to be there
    // from the first write. Waiting costs nothing visible — `isReady` below
    // already blocks the editor on the same list.
    const defaultCurrency = currencies[0]?.currencyCode ?? "";

    if (invoiceId || !merchantId || !defaultCurrency || creatingRef.current) return;

    creatingRef.current = true;

    // Production's first (BILLER) save posts this slice. No callbacks here:
    // they are on the hook, where an unmount cannot discard them.
    createDraft({
      clientId: clientIdParam || undefined,
      gid: gid || undefined,
      currency: defaultCurrency,
      currentStep: "CLIENT",
    });
  }, [invoiceId, merchantId, clientIdParam, gid, currencies, createDraft, router]);

  const invoice = detailsData?.data?.invoice;
  const biller = invoice?.billerDetails ?? billerData?.data;
  const isReady = !!invoice && !!biller && currencies.length > 0;

  // The editor needs all three of the draft, the biller profile and the
  // currency list. If any of them has failed outright, waiting is pointless:
  // say so rather than showing a skeleton that will never resolve.
  const loadFailed = detailsFailed || billerFailed || currenciesFailed;

  /**
   * Bootstrap has five preconditions and each can stall silently — a missing
   * merchant id makes the create effect return without firing, and a disabled
   * query neither loads nor errors. The result was an indefinite skeleton that
   * said nothing about which step was missing.
   *
   * These are the individual answers, surfaced in the stalled panel so the
   * failing step names itself instead of having to be guessed at.
   */
  const readiness = [
    { label: "Merchant account", ok: !!merchantId },
    { label: "Draft invoice", ok: !!invoiceId },
    { label: "Invoice details", ok: !!invoice },
    { label: "Biller profile", ok: !!biller },
    { label: "Currencies", ok: currencies.length > 0 },
  ];

  // Above every early return: hooks must run in the same order on every render.
  // setState lives in the timeout callback, not the effect body.
  useEffect(() => {
    if (isReady) return;
    const timer = setTimeout(() => setIsStalled(true), BOOTSTRAP_STALL_MS);
    return () => clearTimeout(timer);
  }, [isReady]);

  if (status === "SUCCESS" || invoice?.status === "ACTIVE") {
    return (
      <div className="h-full overflow-y-auto">
        <CreateInvoiceSuccess
          invoiceId={invoiceId}
          invoiceNumber={invoice?.invoiceNumber ?? ""}
          clientId={invoice?.clientId ?? ""}
          clientName={invoice?.clientBusinessName || invoice?.clientName || ""}
          total={String(invoice?.totalAmount ?? "0")}
          currency={invoice?.currency ?? ""}
          symbol={symbolFor(invoice?.currency ?? "")}
        />
      </div>
    );
  }

  const failureMessage =
    bootstrapError ??
    (loadFailed
      ? "Some of the data this editor needs could not be loaded. Check your connection and try again."
      : null);

  if (failureMessage) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 p-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <Icon name="alert-circle" className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">
            Couldn&apos;t start the invoice
          </h2>
          <p className="mx-auto mt-1 max-w-md text-[13px] text-muted-foreground">
            {failureMessage}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => router.push("/mca-invoices")}
          >
            Back to invoices
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              // Clearing both lets the bootstrap effect run again.
              setBootstrapError(null);
              creatingRef.current = false;
            }}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!isReady && isStalled ? (
        <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 p-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
            <Icon name="alert-circle" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">
              This is taking longer than expected
            </h2>
            <p className="mx-auto mt-1 max-w-md text-[13px] text-muted-foreground">
              The editor is still waiting on the items below.
            </p>
          </div>

          <ul className="w-full max-w-xs space-y-1.5 text-left">
            {readiness.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-[13px]">
                <Icon
                  name={item.ok ? "check-circle" : "clock"}
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    item.ok ? "text-success" : "text-amber-600"
                  )}
                />
                <span className={item.ok ? "text-muted-foreground" : "font-medium text-foreground"}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => router.push("/mca-invoices")}
            >
              Back to invoices
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                setIsStalled(false);
                creatingRef.current = false;
                router.refresh();
              }}
            >
              Try again
            </Button>
          </div>
        </div>
      ) : isReady ? (
        <InvoiceEditor
          // Remount per invoice: the form seeds from this draft in useState
          // initializers rather than being copied in by an effect.
          key={invoice.id}
          invoice={invoice}
          biller={biller}
          currencies={currencies}
          symbolFor={symbolFor}
          merchantId={merchantId}
          invoiceId={invoiceId}
          gid={gid}
          clientIdParam={clientIdParam}
          today={today}
        />
      ) : (
        <EditorSkeleton onClose={() => router.push("/mca-invoices")} />
      )}
    </div>
  );
}

function InvoiceEditor({
  invoice,
  biller,
  currencies,
  symbolFor,
  merchantId,
  invoiceId,
  gid,
  clientIdParam,
  today,
}: {
  invoice: InvoiceData;
  biller: BillerDetails;
  currencies: CurrencyData[];
  symbolFor: (code: string) => string;
  merchantId: string;
  invoiceId: string;
  gid: string;
  clientIdParam: string;
  today: string;
}) {
  const router = useRouter();

  const [form, setForm] = useState<InvoiceFormState>(() =>
    // The fallback carries the default currency, so a fresh draft with no
    // currency of its own lands on the merchant's first available one.
    toFormState(invoice, emptyForm(today, currencies[0]?.currencyCode ?? ""))
  );
  const [billerDetails, setBillerDetails] = useState<BillerDetails>(() => biller);

  /**
   * The transaction this invoice is attached to, if any.
   *
   * pg-dashboard resolves it as `searchParams.get("gid") ?? invoiceDetails?.gid`
   * at every one of its four call sites, and the URL is only the first of those
   * two sources. Reopening a saved draft from the invoice list goes to
   * /create-invoice?invoiceId=… with no &gid=, so reading the URL alone would
   * drop the link on an invoice that is still attached to a transaction —
   * taking the chip with it, and with it both linked gates (remitter match and
   * amount match) on the one flow that most needs them.
   */
  const linkedGid = gid || invoice.gid || "";

  const linkedTxn = useLinkedTransaction(linkedGid);
  const { clients } = useInvoiceClients(invoiceId);

  /**
   * The currency the server's copy of this draft is known to hold.
   *
   * Seeded from the fetched invoice and moved forward only once a save has
   * actually landed, so the suggested-accounts lookup below always asks about a
   * currency the invoice really has. Tracking `form.currency` instead would
   * race the debounced autosave.
   */
  const [persistedCurrency, setPersistedCurrency] = useState<string>(() => invoice.currency ?? "");

  const { rows: bankRows } = useInvoiceBankAccounts(invoiceId, persistedCurrency);
  const logo = useInvoiceAsset("LOGO");
  const signature = useInvoiceAsset("SIGNATURE");

  const { mutate: saveInvoice, isPending: isSaving } = usePost<
    InvoiceDetailsResponse,
    InvoiceCreatePayload
  >(createInvoiceApi(merchantId), { invalidateQueries: false });

  const { mutate: generateInvoice, isPending: isGenerating } = usePost<
    BaseResponse<null>,
    { isGstInvoice: boolean }
  >(generateInvoiceApi(merchantId, invoiceId), { invalidateQueries: false });

  const { mutate: importSkuItems } = usePost<BaseResponse<null>, SkuImportRequest>(
    skuImportPreviousItemsApi(merchantId),
    { invalidateQueries: false }
  );

  // ── Autosave ───────────────────────────────────────────────────────────────

  const buildPayload = useCallback(
    (): InvoiceCreatePayload =>
      toInvoicePayload({
        form,
        invoiceDetails: { ...invoice, billerDetails },
        invoiceId,
        gid: linkedGid,
        clientIdParam,
      }),
    [form, billerDetails, invoice, invoiceId, linkedGid, clientIdParam]
  );

  const persistDraft = useCallback(() => {
    const payload = buildPayload();
    saveInvoice(payload, {
      // The server now holds this currency, so the suggested-accounts lookup
      // may re-ask against it. This is what makes changing the currency
      // re-resolve the recommended account instead of leaving the one picked
      // for the previous one.
      onSuccess: () => setPersistedCurrency(payload.currency ?? ""),
      // Otherwise fire and forget: a failed autosave must not interrupt typing,
      // and Generate saves again before it finalises.
      onError: () => undefined,
    });
  }, [saveInvoice, buildPayload]);

  // Value-based signature, so the save fires on real edits rather than on every
  // render, and so biller changes (which live outside `form`) trigger it too.
  const editSignature = useMemo(
    () => JSON.stringify({ form, billerDetails }),
    [form, billerDetails]
  );

  useDebouncedAutosave(persistDraft, editSignature, {
    enabled: true,
    delayMs: AUTOSAVE_DEBOUNCE_MS,
  });

  // ── Derived ────────────────────────────────────────────────────────────────

  const patch = (next: Partial<InvoiceFormState>) => setForm((prev) => ({ ...prev, ...next }));

  const totals = getInvoiceTotals(form);
  const symbol = symbolFor(form.currency);
  const selectedAccount = bankRows.find((row) => row.accountNumber === form.accountNo);
  const selectedClient = clients.find((client) => client.id === form.clientId);
  const clientIssue = validateSelectedClient(
    form.clientId,
    clients,
    linkedTxn?.partnerCustomerFullName
  );

  /**
   * The total a transaction-linked invoice has to settle, to 2dp.
   *
   * Production compares the draft's own stored `totalAmount`, which the server
   * seeds from the transaction when the draft is created with a gid. The FFMS
   * record is the same figure read more directly, so it is preferred — but it
   * arrives from a separate search POST, so the draft's value stands in while
   * that is in flight or if it comes back empty. Null only when neither is
   * known yet, which blocks rather than waving the invoice through.
   */
  const linkedExpectedTotal: string | null = !linkedGid
    ? null
    : linkedTxn?.amount != null && linkedTxn.amount !== ""
      ? Number(linkedTxn.amount).toFixed(2)
      : Number.isFinite(invoice?.totalAmount)
        ? Number(invoice?.totalAmount).toFixed(2)
        : null;

  const linkedTotalMismatch = !!linkedExpectedTotal && linkedExpectedTotal !== totals.total;

  const previewSource = {
    form,
    biller: billerDetails,
    client: selectedClient,
    account: selectedAccount,
    logoUrl: logo.url,
    signatureUrl: signature.url,
    symbol,
  };

  // ── Generate ───────────────────────────────────────────────────────────────

  /** Returns an error message when the invoice is not ready to be finalised. */
  const blockingIssue = (): string | null => {
    if (clientIssue.kind === "not-selected") return "Select the client this invoice bills.";
    if (clientIssue.kind === "incomplete-address")
      return "Complete the client's billing address first.";
    if (clientIssue.kind === "remitter-mismatch")
      return "The selected client does not match the remitter on the linked transaction.";
    if (!hasCompleteLineItems(form.lineItems))
      return "Every line item needs a name, type, rate and quantity.";
    // A linked invoice must settle its transaction exactly. Unlike the previous
    // `if (gid && linkedTxn?.amount)` form, an unresolved lookup no longer skips
    // the check silently — production always has a figure to compare against, so
    // having none here is a reason to wait, not to proceed.
    if (linkedGid && !linkedExpectedTotal)
      return "Still loading the linked transaction. Try again in a moment.";
    if (linkedTotalMismatch)
      return `The invoice totals ${totals.total}, but the linked transaction is for ${linkedExpectedTotal}. Adjust the items to match.`;
    if (!form.accountNo) return "Choose the account this invoice should be paid into.";
    if (!form.invoiceNumber.trim()) return "The invoice needs a number.";
    if (!form.invoiceDate) return "Set the issue date.";
    if (!form.dueDate) return "Set the due date.";
    if (form.isRecurring && (!form.recurringType || !form.recurringStartDate))
      return "A recurring invoice needs a frequency and a start date.";
    if (!form.userCreateConsent) return "Accept the declaration before generating.";
    return null;
  };

  const handleGenerate = () => {
    const issue = blockingIssue();
    if (issue) {
      toast.error("Not ready to generate", { description: issue });
      return;
    }

    saveInvoice(buildPayload(), {
      onSuccess: () => {
        // Production imports ticked items when leaving the items step; the flat
        // editor has no step to leave, so it happens once, here.
        const skuItems = form.lineItems
          .filter((item) => item.saveAsSku && item.description)
          .map((item) => ({
            name: item.description,
            type: item.type || null,
            hsnSac: item.hsn ?? "",
            unitPrice: item.unitPrice ?? "",
            currency: form.currency || null,
            description: null as null,
          }));

        if (skuItems.length > 0) {
          importSkuItems(
            { items: skuItems },
            {
              onSuccess: () =>
                toast.success(
                  `${skuItems.length} item${skuItems.length === 1 ? "" : "s"} saved to your SKU catalogue.`
                ),
              onError: () =>
                toast.error("Couldn't save items to the SKU catalogue", {
                  description: "The invoice is unaffected; add them manually later.",
                }),
            }
          );
        }

        generateInvoice(
          // Production hard-codes this; the GST-invoice variant is not exposed
          // in its create flow either.
          { isGstInvoice: false },
          {
            onSuccess: () => {
              if (linkedGid) {
                toast.success("Invoice generated and linked", {
                  description: `Attached to transaction ****${linkedGid.slice(-6)}.`,
                });
                router.push("/mca-transactions");
                return;
              }
              router.replace(`/create-invoice?invoiceId=${invoiceId}&status=SUCCESS`);
            },
            onError: (error) =>
              toast.error("Couldn't generate the invoice", { description: error.message }),
          }
        );
      },
      onError: (error) => toast.error("Couldn't save the invoice", { description: error.message }),
    });
  };

  const handleClose = () => {
    router.push("/mca-invoices");
    if (form.invoiceNumber) {
      toast.info("Saved as draft", {
        description: `Invoice ${form.invoiceNumber} is in your drafts.`,
      });
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <header className="flex shrink-0 flex-wrap items-center gap-4 border-b border-border px-5 py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Close"
          className="h-9 w-9 shrink-0 p-0"
          onClick={handleClose}
        >
          <Icon name="x" className="h-4 w-4" />
        </Button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Create a new invoice
            </h1>
            <StatusBadge variant="muted" label="Draft" size="sm" />
            <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
              <Icon name="refresh" className={isSaving ? "h-3 w-3 animate-spin" : "h-3 w-3"} />
              {isSaving ? "Saving…" : "Auto-saved as you type"}
            </span>
            {linkedGid && <LinkedTransactionChip gid={linkedGid} record={linkedTxn} />}
          </div>
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={isSaving || isGenerating}
          leftIcon={<Icon name="file-text" className="h-3.5 w-3.5" />}
          onClick={handleGenerate}
        >
          {isGenerating ? "Generating…" : "Generate invoice"}
        </Button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_40rem]">
        <div className="min-h-0 overflow-y-auto">
          <div className="mx-auto max-w-[860px] space-y-5 px-6 py-6 lg:px-10">
            <div className="flex flex-wrap items-center gap-2">
              <InvoiceNumberChip
                value={form.invoiceNumber}
                serverValue={invoice.invoiceNumber ?? ""}
                onChange={(invoiceNumber) => patch({ invoiceNumber })}
              />
              <IssueDateChip
                value={form.invoiceDate}
                maxDate={today}
                onChange={(invoiceDate) =>
                  patch({ invoiceDate, dueDate: dueDateForTerm(invoiceDate, form.dueTermId) })
                }
              />
              <DueDateChip
                termId={form.dueTermId}
                dueDate={form.dueDate}
                minDate={form.invoiceDate}
                onTermChange={(dueTermId) =>
                  patch({ dueTermId, dueDate: dueDateForTerm(form.invoiceDate, dueTermId) })
                }
                onCustomDateChange={(dueDate) => patch({ dueDate })}
              />
            </div>

            <BillerSection
              billerDetails={billerDetails}
              isLoading={false}
              onChange={setBillerDetails}
            />

            <BillToSection
              invoiceId={invoiceId}
              clientId={form.clientId}
              onClientIdChange={(clientId) => patch({ clientId })}
              remitterName={linkedTxn?.partnerCustomerFullName}
            />

            <LineItemsSection
              lineItems={form.lineItems}
              onLineItemsChange={(lineItems) => patch({ lineItems })}
              currency={form.currency}
              currencies={currencies}
              symbolFor={symbolFor}
              onCurrencyChange={(currency) => patch({ currency })}
              discountName={form.discountName}
              discountValue={form.discountValue}
              discountType={form.discountType}
              taxName={form.taxName}
              taxValue={form.taxValue}
              onTotalsFieldChange={patch}
              linkedExpectedTotal={linkedTotalMismatch ? linkedExpectedTotal : null}
              linkedCurrency={linkedTxn?.currency ?? form.currency}
            />

            <PaymentDetailsSection
              invoiceId={invoiceId}
              currency={persistedCurrency}
              accountNo={form.accountNo}
              onAccountNoChange={(accountNo) => patch({ accountNo })}
            />

            <NotesAndTermsSection
              memo={form.memo}
              notes={form.notes}
              lut={form.lut}
              onChange={patch}
            />

            <RecurringSection
              isRecurring={form.isRecurring}
              recurringType={form.recurringType}
              recurringStartDate={form.recurringStartDate}
              minStartDate={today}
              onChange={patch}
            />

            <ConsentSection
              checked={form.userCreateConsent}
              isLinkedToTransaction={!!linkedGid}
              onChange={(userCreateConsent) => patch({ userCreateConsent })}
            />
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto bg-muted">
          <div className="space-y-4 p-4 md:p-6">
            <InvoicePreviewSidebar source={previewSource} />
            <BrandingSection
              logoEnabled={form.logoEnabled}
              signatureEnabled={form.signatureEnabled}
              onChange={patch}
            />
          </div>
        </div>
      </div>
    </>
  );
}
