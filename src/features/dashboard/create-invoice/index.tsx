"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button, Shimmer, SplitButton, SplitButtonItem, StatusBadge } from "@/components/ui";
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
import type { InvoiceThemePalette } from "@/features/dashboard/create-invoice/hooks";
import {
  useDebouncedAutosave,
  useInvoiceBankAccounts,
  useInvoiceClients,
  useInvoiceMerchantId,
  useInvoiceAsset,
  useInvoiceTemplates,
  useInvoiceThemes,
  useLinkedTransaction,
  useMcaCurrencies,
} from "@/features/dashboard/create-invoice/hooks";
import {
  applyTemplateSnapshot,
  brandingFrom,
  getInvoiceTotals,
  hasCompleteLineItems,
  toFormState,
  toInvoicePayload,
  toTemplateSnapshot,
  validateSelectedClient,
} from "@/features/dashboard/create-invoice/helpers";
import {
  AUTOSAVE_DEBOUNCE_MS,
  DEFAULT_THEME_METADATA,
} from "@/features/dashboard/create-invoice/constants";
import {
  DueDateChip,
  InvoiceNumberChip,
  IssueDateChip,
  ChipField,
  dueDateForTerm,
  toDateKey,
} from "@/features/dashboard/create-invoice/components/InvoiceHeaderChips";
import { InvoiceTemplatePicker } from "@/features/dashboard/create-invoice/components/InvoiceTemplatePicker";
import { SaveAsTemplateDialog } from "@/features/dashboard/create-invoice/components/SaveAsTemplateDialog";
import { ManageTemplatesDialog } from "@/features/dashboard/create-invoice/components/ManageTemplatesDialog";
import { AssetUploadDialog } from "@/features/dashboard/create-invoice/components/AssetUploadDialog";
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
import { GuideLauncher } from "@/components/common/guide/GuideLauncher";
import { SelectMidView } from "@/components/common/SelectMidView";
import {
  ReadinessChecklist,
  type InvoiceRequirement,
} from "@/features/dashboard/create-invoice/components/ReadinessChecklist";
import { usePacbMidScope } from "@/lib/hooks/usePacbMidScope";
import {
  CREATE_INVOICE_GUIDE_KEY,
  CREATE_INVOICE_GUIDE_STEPS,
} from "@/features/dashboard/create-invoice/guide";
import type {
  BillerDetails,
  BillerDetailsResponse,
  CurrencyData,
  InvoiceCreatePayload,
  InvoiceData,
  InvoiceDetailsResponse,
  InvoiceFormState,
  InvoiceTemplate,
  ThemeMetadata,
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
  const { needsMidChoice, midOptions, selectMid } = usePacbMidScope();

  /**
   * The editor cannot open without knowing which merchant the invoice is for:
   * every endpoint below puts a MID in its path, and `useInvoiceMerchantId`
   * falls back to the merchant's first PACB MID when none is selected — which
   * would raise the invoice under an account the merchant never chose.
   *
   * Every in-app entry point now answers that before navigating: the dashboard
   * button and quick-access tile ask (MidScopedAction), and the rows that
   * already know — a transaction, a saved draft — set it from the record. So
   * this only ever catches a pasted link or a bookmark, where nothing has said
   * which account is meant. Nothing has been created at this point, so leaving
   * costs the merchant nothing.
   *
   * The picker is rendered *in* the card rather than the usual "use the selector
   * in the sidebar": this route is the full-screen editor shell, which draws no
   * sidebar at all, so that instruction would point at nothing.
   */
  if (needsMidChoice) {
    return (
      <>
        <header className="flex shrink-0 flex-wrap items-center gap-4 border-b border-border px-5 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Close"
            className="h-9 w-9 shrink-0 p-0"
            onClick={() => router.push("/mca-invoices")}
          >
            <Icon name="x" className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Create a new invoice
          </h1>
        </header>
        <div className="mx-auto w-full max-w-2xl px-6 py-16">
          <SelectMidView midType="PACB" midOptions={midOptions} onSelectMid={selectMid} />
        </div>
      </>
    );
  }

  return <CreateInvoiceBootstrap />;
}

/**
 * Everything the editor needs before it can mount: the draft, the biller
 * profile, the currency list and the theme palette. Split out of
 * CreateInvoiceFeature above so the MID gate can return before any of these
 * fire — a draft must not be created against a MID the merchant has not picked.
 */
function CreateInvoiceBootstrap() {
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
   * Fetched here rather than inside the editor so the first paint can wait for
   * it. The invoice stores theme NAMES, so a save is correct whether or not this
   * resolved — but the preview needs the hexes to draw them, and rendering the
   * document in the local fallback palette and then repainting it in the
   * server's is exactly the abrupt flip this gate exists to avoid.
   *
   * It cannot block indefinitely: on failure `isLoading` goes false and the
   * fallback palette stands, so a themes outage costs a shade, not an invoice.
   */
  const palette = useInvoiceThemes();

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
    isFetchedAfterMount: detailsFetchedAfterMount,
  } = useGet<InvoiceDetailsResponse>(
    ["invoice-details", merchantId, invoiceId],
    detailsUrl,
    undefined,
    /**
     * Always revalidated on mount.
     *
     * The app's default staleTime is 30s and nothing invalidates this key —
     * autosave posts with `invalidateQueries: false` on purpose, so typing does
     * not refetch — so reopening a draft within 30s used to make no request at
     * all and rebind the editor to the document as it was before the session's
     * saves. `staleTime: 0` is what guarantees the request; `isReady` below is
     * what makes the first paint wait for it.
     */
    { enabled: !!detailsUrl, staleTime: 0 }
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
  /**
   * `detailsFetchedAfterMount` is load-bearing, not a nicety.
   *
   * react-query hands over whatever it has cached on the first render and
   * revalidates behind it. Painting that copy means showing a document that is
   * about to change under the merchant — which is precisely how a theme picked
   * and saved appeared as the old one and then snapped to the new one a moment
   * later. Requiring a fetch from THIS mount means the shimmer covers the round
   * trip and the editor opens on the invoice the server actually holds.
   *
   * It only ever goes false → true, so it cannot unmount the editor mid-edit.
   */
  const isReady =
    detailsFetchedAfterMount &&
    !!invoice &&
    !!biller &&
    currencies.length > 0 &&
    !palette.isLoading;

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
    { label: "Invoice details", ok: detailsFetchedAfterMount && !!invoice },
    { label: "Biller profile", ok: !!biller },
    { label: "Currencies", ok: currencies.length > 0 },
    { label: "Invoice themes", ok: !palette.isLoading },
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
          palette={palette}
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
  palette,
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
  palette: InvoiceThemePalette;
  symbolFor: (code: string) => string;
  merchantId: string;
  invoiceId: string;
  gid: string;
  clientIdParam: string;
  today: string;
}) {
  const router = useRouter();

  /**
   * The form, derived rather than copied.
   *
   * `edits` holds only the fields the merchant has changed this session; the rest
   * are read from the fetched document on every render. That is the same shape as
   * `brandingOverride` below, and for the same reason.
   *
   * The alternative — one `useState` seeded from the document, which is what this
   * was — makes the editor's copy authoritative from the first render. Anything
   * the server later reports is then unreachable, and worse, every subsequent
   * autosave posts the whole seeded form back: a draft opened from a stale cache
   * would quietly write last session's line items over the newer ones on the
   * first keystroke anywhere in the form. Deriving means an untouched field is
   * never something this editor can revert, because it never held a stale copy
   * of it to send.
   *
   * Reads go through `form`; writes go through `patch`. Nothing else touches
   * `edits`.
   */
  const [edits, setEdits] = useState<Partial<InvoiceFormState>>({});

  const serverForm = useMemo(
    // The fallback carries the default currency, so a fresh draft with no
    // currency of its own lands on the merchant's first available one.
    () => toFormState(invoice, emptyForm(today, currencies[0]?.currencyCode ?? "")),
    [invoice, today, currencies]
  );

  const form = useMemo<InvoiceFormState>(() => ({ ...serverForm, ...edits }), [serverForm, edits]);

  /**
   * The biller is still seeded, not derived, and that is deliberate.
   *
   * It is edited as a whole block by <BillerSection> rather than field by field,
   * and it reaches the editor from `invoice.billerDetails` — the same document
   * `serverForm` reads — so the first paint already has the server's copy. There
   * is no partial-override to express.
   */
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

  /**
   * Branding, derived rather than seeded.
   *
   * Every other field in this editor is copied into `form` once, in a useState
   * initializer. Branding deliberately is not, and the difference is the whole
   * fix for the theme reverting: react-query paints the cached document first and
   * revalidates behind it, so anything copied in on that first render keeps the
   * stale value even after the fresh document arrives, because the form seeds
   * once and `key={invoice.id}` does not change.
   *
   * So: the invoice's own `themeMetadata` is the source, read on every render, and
   * this state holds only what the merchant has picked *this session*. A
   * revalidation therefore corrects the theme on its own, and a merchant who has
   * chosen one keeps it, because their override outranks the document.
   *
   * `edits` above is the same pattern for the rest of the form, so nothing in
   * this editor holds a stale copy of a field the merchant has not touched.
   */
  const [brandingOverride, setBrandingOverride] = useState<ThemeMetadata | null>(null);
  const branding = useMemo(
    () => brandingOverride ?? brandingFrom(invoice.themeMetadata),
    [brandingOverride, invoice.themeMetadata]
  );
  const patchBranding = (next: Partial<ThemeMetadata>) =>
    setBrandingOverride({ ...branding, ...next });

  const logo = useInvoiceAsset("LOGO");
  const signature = useInvoiceAsset("SIGNATURE");

  // ── Templates ──────────────────────────────────────────────────────────────
  // One seam for the whole feature: the picker, both dialogs and the header's
  // split button reach templates only through this hook.
  const templateStore = useInvoiceTemplates();

  /**
   * The template this invoice was built from, derived like branding is.
   *
   * The invoice carries `templateId`, so the document is the source and this
   * state holds only what the merchant did this session: a template id when they
   * applied one, `null` when they detached. `undefined` means "follow the
   * document", which is what a fresh mount starts on — so reopening a draft
   * still offers "Update template" without anything being remembered locally.
   */
  const [templateLink, setTemplateLink] = useState<string | null | undefined>(undefined);
  const activeTemplateId = templateLink !== undefined ? templateLink : (invoice.templateId ?? null);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  /** The readiness popover. Opened by the merchant, and by a Generate press that
   *  cannot go through — see handleGenerate. */
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [manageTemplatesOpen, setManageTemplatesOpen] = useState(false);
  /** Which asset the upload dialog is open for, or null when it is closed. */
  const [uploadingAsset, setUploadingAsset] = useState<"LOGO" | "SIGNATURE" | null>(null);

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
        branding,
        templateId: activeTemplateId,
        invoiceDetails: { ...invoice, billerDetails },
        invoiceId,
        gid: linkedGid,
        clientIdParam,
      }),
    [form, branding, activeTemplateId, billerDetails, invoice, invoiceId, linkedGid, clientIdParam]
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

  /**
   * Value-based signature, so the save fires on real edits rather than on every
   * render, and so biller changes (which live outside `form`) trigger it too.
   *
   * Keyed on the merchant's own changes — `edits` and `brandingOverride` — and
   * deliberately NOT on the effective `form` or `branding`, both of which also
   * move when a revalidation brings a newer document.
   *
   * An incoming server change is not an edit. Treating it as one would fire a
   * save immediately after every refetch, which at best writes back what the
   * server just sent and at worst races it. Reacting only to what the merchant
   * did keeps revalidation silent, and every real edit still schedules a save
   * that carries the whole document.
   */
  const editSignature = useMemo(
    () => JSON.stringify({ edits, brandingOverride, templateLink, billerDetails }),
    [edits, brandingOverride, templateLink, billerDetails]
  );

  useDebouncedAutosave(persistDraft, editSignature, {
    enabled: true,
    delayMs: AUTOSAVE_DEBOUNCE_MS,
  });

  // ── Derived ────────────────────────────────────────────────────────────────

  const patch = (next: Partial<InvoiceFormState>) => setEdits((prev) => ({ ...prev, ...next }));

  const totals = getInvoiceTotals(form);

  // ── Template actions ───────────────────────────────────────────────────────

  /** Whether there is anything worth saving, and worth warning before replacing. */
  const hasTemplatableContent =
    form.lineItems.length > 0 || !!form.notes.trim() || !!form.memo.trim();

  const activeTemplate = templateStore.templates.find(
    (template) => template.id === activeTemplateId
  );

  const handleApplyTemplate = (template: InvoiceTemplate) => {
    const next = applyTemplateSnapshot(template);
    // A template's branding is an explicit choice, so it becomes the override.
    setBrandingOverride(brandingFrom(template.snapshot));

    // "custom" is not a reusable term — it means a date somebody picked by hand
    // for one invoice — so it is treated like no term at all.
    const carriesTerm = !!next.dueTermId && next.dueTermId !== "custom";

    // Reads the current effective values rather than a `prev` callback: applying
    // a template is a deliberate act on what is on screen, and `form` IS what is
    // on screen. The two carried-over fields are written back explicitly so a
    // template that has no term of its own cannot leave the due date derived from
    // one it does not carry.
    patch({
      ...next,
      dueTermId: carriesTerm ? next.dueTermId : form.dueTermId,
      dueDate: carriesTerm ? dueDateForTerm(form.invoiceDate, next.dueTermId) : form.dueDate,
    });

    setTemplateLink(template.id);
    // Only record a genuine use. Re-applying the template already in force is a
    // reset, not a use, and it would keep bumping the template's lastUsedAt.
    if (template.id !== activeTemplateId) templateStore.markUsed(template.id);

    // Ordered by how much it blocks the merchant: a missing start date stops
    // Generate outright, so that is worth saying over the reassurance.
    const followUp =
      next.isRecurring && !form.recurringStartDate
        ? "Set the recurring start date: a schedule cannot be reused from a template."
        : "Client, invoice number, dates and receiving account are unchanged.";

    toast.success(`Applied "${template.name}"`, { description: followUp });
  };

  /**
   * The server mints the id, so the link and the dialog both wait for it. On
   * failure the hook has already said so and the dialog stays open with the name
   * still typed, which is the only state a merchant can act on.
   */
  const handleSaveTemplate = (name: string) => {
    templateStore.save(name, toTemplateSnapshot(form, branding), (templateId) => {
      setTemplateLink(templateId);
      setSaveTemplateOpen(false);
      toast.success("Template saved", { description: `"${name}" is ready to reuse.` });
    });
  };

  const handleUpdateTemplate = () => {
    if (!activeTemplate) return;
    // The snapshot being replaced is passed along for the fields the template
    // owns and this editor cannot set — see toTemplateSnapshot.
    templateStore.update(
      activeTemplate.id,
      toTemplateSnapshot(form, branding, activeTemplate.snapshot)
    );
    toast.success("Template updated", {
      description: `"${activeTemplate.name}" now matches this invoice.`,
    });
  };

  /**
   * Unlinks this invoice from the template it came from.
   *
   * Deliberately not "start over": everything the merchant has on screen stays,
   * only the association goes. That is what makes it safe to offer without a
   * confirmation, and it is the useful direction — the reason to detach is
   * usually that this invoice has diverged from the template and should stop
   * being a candidate to overwrite it.
   *
   * The header therefore reverts from "Update template" to "Save as template",
   * so the next save forks rather than overwrites.
   */
  const handleDetachTemplate = () => {
    if (!activeTemplate) return;
    setTemplateLink(null);
    toast.success("Detached from template", {
      description: `This invoice is no longer linked to "${activeTemplate.name}". Nothing on it changed.`,
    });
  };

  const handleDeleteTemplate = (templateId: string) => {
    templateStore.remove(templateId);
    // The invoice keeps its content; it just no longer descends from anything.
    if (templateId === activeTemplateId) setTemplateLink(null);
    toast.success("Template deleted");
  };

  // ── Branding actions ───────────────────────────────────────────────────────

  /**
   * Back to the pair the server itself defaults to.
   *
   * Picking a theme no longer touches the colours, which is a change from when
   * each theme carried its own two hexes. The renderer applies one colour pair to
   * whichever layout it is given, so a theme that reassigned them would be
   * inventing a relationship the document does not have — and would silently
   * discard a merchant's brand colour the moment they tried a different layout.
   */
  const handleResetColors = () =>
    patchBranding({
      color: DEFAULT_THEME_METADATA.color,
      accent: DEFAULT_THEME_METADATA.accent,
    });

  /**
   * One dialog serves both assets and both entry points (the branding panel and
   * the placeholder on the document), so there is a single upload path and a
   * single busy state per asset.
   */
  const handleAssetUpload = (file: File) => {
    if (uploadingAsset === "SIGNATURE") {
      signature.upload(file);
      // Uploading is an intent to show it; leaving the toggle off would put the
      // merchant's signature nowhere.
      if (!form.signatureEnabled) patch({ signatureEnabled: true });
      return;
    }
    logo.upload(file);
    if (!form.logoEnabled) patch({ logoEnabled: true });
  };
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
    // Names are what the invoice stores; the document has to be drawn in
    // something, so the hexes are resolved here and go no further than the paper.
    theme: branding.theme,
    primaryHex: palette.colorHexFor(branding.color),
    accentHex: palette.accentHexFor(branding.accent),
  };

  // ── Generate ───────────────────────────────────────────────────────────────

  /**
   * Everything this invoice needs, met or not, in the order the page is filled
   * in — the same conditions the old `blockingIssue()` checked, but all of them
   * reported at once rather than the first one as a toast. See ReadinessChecklist
   * for why. `problem` non-null is what marks a requirement outstanding, so each
   * entry states its own rule exactly once.
   */
  const requirement = (
    id: string,
    label: string,
    fieldId: string | null,
    problem: string | null,
    doneDetail: string
  ): InvoiceRequirement => ({
    id,
    label,
    fieldId,
    done: problem === null,
    detail: problem ?? doneDetail,
  });

  const requirements: InvoiceRequirement[] = [
    requirement(
      "client",
      "Client",
      "client",
      clientIssue.kind === "not-selected"
        ? "Pick who this invoice bills."
        : clientIssue.kind === "incomplete-address"
          ? "Complete their billing address — it prints on the invoice."
          : clientIssue.kind === "remitter-mismatch"
            ? "This client is not the remitter on the linked transaction."
            : null,
      selectedClient?.businessName ?? "Selected."
    ),
    requirement(
      "line-items",
      "Line items",
      "line-items",
      hasCompleteLineItems(form.lineItems)
        ? null
        : form.lineItems.length === 0
          ? "Add at least one thing you are billing for."
          : "Every line needs a name, type, rate and quantity.",
      `${form.lineItems.length} item${form.lineItems.length === 1 ? "" : "s"}, totalling ${totals.total}.`
    ),
    // A linked invoice must settle its transaction exactly. An unresolved lookup
    // blocks rather than waving the invoice through — production always has a
    // figure to compare against, so having none is a reason to wait.
    ...(linkedGid
      ? [
          requirement(
            "linked-total",
            "Linked transaction",
            "line-items",
            !linkedExpectedTotal
              ? "Still loading the transaction this settles. Try again in a moment."
              : linkedTotalMismatch
                ? `The items total ${totals.total}, but the transaction is for ${linkedExpectedTotal}.`
                : null,
            `Matches the transaction's ${linkedExpectedTotal}.`
          ),
        ]
      : []),
    requirement(
      "payment-account",
      "Receiving account",
      "payment-account",
      form.accountNo ? null : "Choose the account this invoice is paid into.",
      selectedAccount?.accountNumber ?? "Chosen."
    ),
    requirement(
      "invoice-number",
      "Invoice number",
      "invoice-number",
      form.invoiceNumber.trim() ? null : "The invoice needs a number.",
      form.invoiceNumber
    ),
    requirement(
      "issue-date",
      "Issue date",
      "issue-date",
      form.invoiceDate ? null : "Set the date this invoice is issued.",
      form.invoiceDate
    ),
    requirement(
      "due-date",
      "Due date",
      "due-date",
      form.dueDate ? null : "Set when payment is due.",
      form.dueDate
    ),
    ...(form.isRecurring
      ? [
          requirement(
            "recurring",
            "Recurring schedule",
            "recurring",
            form.recurringType && form.recurringStartDate
              ? null
              : "A recurring invoice needs a frequency and a start date.",
            `${form.recurringType} from ${form.recurringStartDate}.`
          ),
        ]
      : []),
    requirement(
      "consent",
      "Declaration",
      "consent",
      form.userCreateConsent ? null : "Accept the declaration before generating.",
      "Accepted."
    ),
  ];

  const outstanding = requirements.filter((r) => !r.done);

  const handleGenerate = () => {
    // The checklist beside the button is the message now: it names every
    // outstanding item at once and each one is a control that scrolls to its own
    // field, which a toast could be neither of.
    if (outstanding.length > 0) {
      setChecklistOpen(true);
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
              {isSaving ? "Saving…" : "Auto-saved"}
            </span>
            {linkedGid && <LinkedTransactionChip gid={linkedGid} record={linkedTxn} />}
          </div>
        </div>

        {/* Sits immediately left of Generate, because it is the answer to the
            question that button raises. */}
        <ReadinessChecklist
          requirements={requirements}
          open={checklistOpen}
          onOpenChange={setChecklistOpen}
        />

        {/* Nova's split button, restored. The menu offers exactly one of "Save
            as template" or "Update template" depending on whether this invoice
            came from one, because offering both invites the merchant to guess
            which of the two they want. */}
        <SplitButton
          data-guide="invoice-generate"
          label={isGenerating ? "Generating…" : "Generate invoice"}
          variant="primary"
          size="sm"
          disabled={isSaving || isGenerating}
          onClick={handleGenerate}
          /**
           * Squares the two facing corners so the pair reads as one control.
           *
           * flux already asks for this — it passes `rounded-r-none` to the label
           * button and `rounded-l-none` to the caret — but those never take
           * effect. `cn` is twMerge, and `rounded-lg` (all corners) and
           * `rounded-r-none` (right corners) are different conflict groups, so
           * twMerge keeps both and the stylesheet's ordering lets the shorthand
           * re-round the corners the component just squared. The result is two
           * separate pills with a sliver of background between them.
           *
           * A child selector outranks a plain utility on specificity, so this
           * wins regardless of sheet order. `button+button` rather than
           * `:last-child` because the open menu is itself the last child.
           */
          className="[&>button+button]:rounded-l-none [&>button:first-child]:rounded-r-none"
        >
          {/* `whitespace-nowrap` on every item is load-bearing. flux positions
              the menu with `right-0` and no `left`, so its width shrinks to fit
              inside the button's own width — narrower than "Detach from
              template", which therefore wrapped onto two lines. Refusing to wrap
              makes each item's min-content the full phrase, which is what lets
              the menu size itself to its longest entry instead.

              "Update ⟨name⟩" additionally truncates: a merchant-typed template
              name is unbounded, and nowrap alone would let a long one push the
              menu off the side of the screen. */}
          {activeTemplate ? (
            <>
              <SplitButtonItem
                className="max-w-[18rem] truncate whitespace-nowrap"
                onClick={handleUpdateTemplate}
              >
                Update &ldquo;{activeTemplate.name}&rdquo;
              </SplitButtonItem>
              {/* Detaching turns the item above back into "Save as template",
                  which is how an invoice that has outgrown its template becomes
                  a new one instead of overwriting the old. */}
              <SplitButtonItem className="whitespace-nowrap" onClick={handleDetachTemplate}>
                Detach from template
              </SplitButtonItem>
            </>
          ) : (
            /**
             * Still disabled with nothing worth saving, but no longer silent
             * about it.
             *
             * A disabled control that does not say why leaves the merchant to
             * decide whether the app is broken — the DQA's point about disabled
             * states needing an explanation. A menu item receives no pointer
             * events once disabled, so a tooltip on it would never fire; the
             * reason therefore renders inside the item, under the label.
             */
            <SplitButtonItem
              className="whitespace-nowrap"
              disabled={!hasTemplatableContent}
              onClick={() => setSaveTemplateOpen(true)}
            >
              <span className="flex flex-col items-start">
                Save as template
                {!hasTemplatableContent && (
                  <span className="text-[11px] font-normal text-muted-foreground">
                    Add a line item or note first
                  </span>
                )}
              </span>
            </SplitButtonItem>
          )}
          {/* Deliberately never disabled. With no templates yet this opens a
              dialog that explains how to make one, which answers the merchant's
              question instead of refusing the click and leaving them to guess
              what the item would have done. */}
          <SplitButtonItem
            className="whitespace-nowrap"
            onClick={() => setManageTemplatesOpen(true)}
          >
            Manage templates
          </SplitButtonItem>
        </SplitButton>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_40rem]">
        <div className="min-h-0 overflow-y-auto">
          <div className="mx-auto max-w-[860px] space-y-5 px-6 py-6 lg:px-10">
            {/* Three captioned fields, not a loose row of pills: the due date is
                required and was the hardest thing on this page to find, because
                nothing named any of the three and an unset one drew as a bare
                link. items-end keeps the chips on one baseline under captions of
                differing length. */}
            <div
              className="flex flex-wrap items-end gap-x-4 gap-y-3"
              data-guide="invoice-dates"
            >
              <ChipField label="Invoice number" fieldId="invoice-number">
                <InvoiceNumberChip
                  value={form.invoiceNumber}
                  serverValue={invoice.invoiceNumber ?? ""}
                  onChange={(invoiceNumber) => patch({ invoiceNumber })}
                />
              </ChipField>
              <ChipField label="Issue date" fieldId="issue-date">
                <IssueDateChip
                  value={form.invoiceDate}
                  maxDate={today}
                  onChange={(invoiceDate) =>
                    patch({ invoiceDate, dueDate: dueDateForTerm(invoiceDate, form.dueTermId) })
                  }
                />
              </ChipField>
              <ChipField label="Due date" required fieldId="due-date">
                <DueDateChip
                  termId={form.dueTermId}
                  dueDate={form.dueDate}
                  minDate={form.invoiceDate}
                  onTermChange={(dueTermId) =>
                    patch({ dueTermId, dueDate: dueDateForTerm(form.invoiceDate, dueTermId) })
                  }
                  onCustomDateChange={(dueDate) => patch({ dueDate })}
                />
              </ChipField>
            </div>

            <div data-guide="invoice-template">
              <InvoiceTemplatePicker
                templates={templateStore.templates}
                isReady={templateStore.isReady}
                activeTemplateId={activeTemplateId}
                hasContent={hasTemplatableContent}
                onApply={handleApplyTemplate}
                onDetach={handleDetachTemplate}
                onManage={() => setManageTemplatesOpen(true)}
                onSaveCurrent={() => setSaveTemplateOpen(true)}
              />
            </div>

            <BillerSection
              billerDetails={billerDetails}
              isLoading={false}
              onChange={setBillerDetails}
            />

            <div data-guide="invoice-client" data-field="client">
              <BillToSection
                invoiceId={invoiceId}
                clientId={form.clientId}
                onClientIdChange={(clientId) => patch({ clientId })}
                remitterName={linkedTxn?.partnerCustomerFullName}
              />
            </div>

            <div data-guide="invoice-items" data-field="line-items">
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
            </div>

            <div data-guide="invoice-payment" data-field="payment-account">
              <PaymentDetailsSection
                invoiceId={invoiceId}
                currency={persistedCurrency}
                accountNo={form.accountNo}
                onAccountNoChange={(accountNo) => patch({ accountNo })}
              />
            </div>

            <NotesAndTermsSection
              memo={form.memo}
              notes={form.notes}
              lut={form.lut}
              onChange={patch}
            />

            <div data-field="recurring">
              <RecurringSection
                isRecurring={form.isRecurring}
                recurringType={form.recurringType}
                recurringStartDate={form.recurringStartDate}
                minStartDate={today}
                onChange={patch}
              />
            </div>

            <div data-guide="invoice-consent" data-field="consent">
              <ConsentSection
                checked={form.userCreateConsent}
                isLinkedToTransaction={!!linkedGid}
                onChange={(userCreateConsent) => patch({ userCreateConsent })}
              />
            </div>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto bg-muted">
          <div className="space-y-4 p-4 md:p-6" data-guide="invoice-preview">
            <InvoicePreviewSidebar
              source={previewSource}
              onLogoClick={() => setUploadingAsset("LOGO")}
            />
            <BrandingSection
              logoEnabled={form.logoEnabled}
              signatureEnabled={form.signatureEnabled}
              branding={branding}
              palette={palette}
              logo={logo}
              signature={signature}
              onChange={patch}
              onBrandingChange={patchBranding}
              onResetColors={handleResetColors}
              onOpenUpload={setUploadingAsset}
            />
          </div>
        </div>
      </div>

      <SaveAsTemplateDialog
        open={saveTemplateOpen}
        onOpenChange={setSaveTemplateOpen}
        snapshot={
          hasTemplatableContent
            ? toTemplateSnapshot(form, branding, activeTemplate?.snapshot)
            : null
        }
        existingNames={templateStore.templates.map((template) => template.name)}
        isSaving={templateStore.isMutating}
        onSave={handleSaveTemplate}
      />

      <ManageTemplatesDialog
        open={manageTemplatesOpen}
        onOpenChange={setManageTemplatesOpen}
        templates={templateStore.templates}
        isMutating={templateStore.isMutating}
        onRename={templateStore.rename}
        onDelete={handleDeleteTemplate}
      />

      {/* Persistent launcher, bottom-right, replayable. Not auto-started: this
          editor is often reopened on a draft, and a tour that runs itself every
          time would be in the way. */}
      <GuideLauncher steps={CREATE_INVOICE_GUIDE_STEPS} storageKey={CREATE_INVOICE_GUIDE_KEY} />

      <AssetUploadDialog
        open={!!uploadingAsset}
        onOpenChange={(open) => setUploadingAsset(open ? uploadingAsset : null)}
        label={uploadingAsset === "SIGNATURE" ? "Signature" : "Logo"}
        isUploading={uploadingAsset === "SIGNATURE" ? signature.isUploading : logo.isUploading}
        onUpload={handleAssetUpload}
      />
    </>
  );
}
