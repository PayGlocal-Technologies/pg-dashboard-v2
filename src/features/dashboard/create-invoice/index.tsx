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
import {
  useDebouncedAutosave,
  useInvoiceBankAccounts,
  useInvoiceClients,
  useInvoiceMerchantId,
  useDraftMemory,
  useInvoiceAsset,
  useInvoiceTemplates,
  useLinkedTransaction,
  useMcaCurrencies,
} from "@/features/dashboard/create-invoice/hooks";
import {
  applyTemplateSnapshot,
  getInvoiceTotals,
  hasCompleteLineItems,
  toFormState,
  toInvoicePayload,
  toTemplateSnapshot,
  validateSelectedClient,
} from "@/features/dashboard/create-invoice/helpers";
import {
  AUTOSAVE_DEBOUNCE_MS,
  DEFAULT_BRANDING_STYLE,
  INVOICE_BRANDING_STYLES,
} from "@/features/dashboard/create-invoice/constants";
import { DEFAULT_INVOICE_LANGUAGE } from "@/features/dashboard/create-invoice/i18n";
import {
  DueDateChip,
  InvoiceNumberChip,
  IssueDateChip,
  dueDateForTerm,
  toDateKey,
} from "@/features/dashboard/create-invoice/components/InvoiceHeaderChips";
import { InvoiceTemplatePicker } from "@/features/dashboard/create-invoice/components/InvoiceTemplatePicker";
import { SaveAsTemplateDialog } from "@/features/dashboard/create-invoice/components/SaveAsTemplateDialog";
import { ManageTemplatesDialog } from "@/features/dashboard/create-invoice/components/ManageTemplatesDialog";
import { LogoUploadDialog } from "@/features/dashboard/create-invoice/components/LogoUploadDialog";
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
  InvoiceTemplate,
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

    // Branding defaults to the one theme the server actually renders, so a
    // merchant who never opens the panel gets a preview that matches their PDF.
    brandingStyleId: DEFAULT_BRANDING_STYLE.id,
    primaryColor: DEFAULT_BRANDING_STYLE.defaultPrimaryColor,
    accentColor: DEFAULT_BRANDING_STYLE.defaultAccentColor,
    language: DEFAULT_INVOICE_LANGUAGE,

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

  // ── Templates ──────────────────────────────────────────────────────────────
  // One seam for the whole feature; see useInvoiceTemplates for what changes
  // when the endpoint lands.
  const templateStore = useInvoiceTemplates();

  /** The template this invoice was built from, if any. */
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [manageTemplatesOpen, setManageTemplatesOpen] = useState(false);
  /** Which asset the cropper is open for, or null when it is closed. */
  const [cropperType, setCropperType] = useState<"LOGO" | "SIGNATURE" | null>(null);

  /**
   * Restores what the invoice itself cannot carry: the template it came from and
   * its branding. Without this, reopening a draft reset the theme to the default
   * and turned "Update template" back into "Save as template", so editing
   * yesterday's draft produced a duplicate template.
   *
   * The callback runs from the store's rehydrate continuation, which is why the
   * setState here is legitimate — see useDraftMemory.
   */
  const { isReady: memoryReady, remember: rememberDraft } = useDraftMemory(invoiceId, (memory) => {
    setActiveTemplateId(memory.templateId);
    setForm((prev) => ({
      ...prev,
      brandingStyleId: memory.brandingStyleId,
      primaryColor: memory.primaryColor,
      accentColor: memory.accentColor,
      language: memory.language,
    }));
  });

  /**
   * Write-only, and gated on `memoryReady` so the defaults this form was seeded
   * with cannot overwrite a stored record before it has been read back in.
   *
   * Depends on the individual fields rather than on the hook's return value:
   * that object is rebuilt every render, so taking it as a dependency would
   * write to localStorage on every keystroke anywhere in the form. `remember` is
   * memoised on the invoice id, so these deps only change when the branding or
   * the template link actually does.
   */
  useEffect(() => {
    if (!memoryReady) return;
    rememberDraft({
      templateId: activeTemplateId,
      brandingStyleId: form.brandingStyleId,
      primaryColor: form.primaryColor,
      accentColor: form.accentColor,
      language: form.language,
    });
  }, [
    memoryReady,
    rememberDraft,
    activeTemplateId,
    form.brandingStyleId,
    form.primaryColor,
    form.accentColor,
    form.language,
  ]);

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

  /**
   * Value-based signature, so the save fires on real edits rather than on every
   * render, and so biller changes (which live outside `form`) trigger it too.
   *
   * The four branding fields are excluded on purpose: nothing sends them yet
   * (see the branding block in types.ts), so including them would fire a POST
   * whose payload is byte-identical to the last one and flash "Saving…" for a
   * change that is not being saved — a worse lie than not saving at all, because
   * the merchant reads the indicator as confirmation. They ride along in a saved
   * template instead, which is real storage.
   *
   * Delete this destructure when the payload learns those fields, and the
   * signature goes back to the whole form.
   */
  const editSignature = useMemo(() => {
    const {
      brandingStyleId: _brandingStyleId,
      primaryColor: _primaryColor,
      accentColor: _accentColor,
      language: _language,
      ...persisted
    } = form;
    return JSON.stringify({ persisted, billerDetails });
  }, [form, billerDetails]);

  useDebouncedAutosave(persistDraft, editSignature, {
    enabled: true,
    delayMs: AUTOSAVE_DEBOUNCE_MS,
  });

  // ── Derived ────────────────────────────────────────────────────────────────

  const patch = (next: Partial<InvoiceFormState>) => setForm((prev) => ({ ...prev, ...next }));

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

    // "custom" is not a reusable term — it means a date somebody picked by hand
    // for one invoice — so it is treated like no term at all.
    const carriesTerm = !!next.dueTermId && next.dueTermId !== "custom";

    /**
     * Whether to keep the template's receiving account.
     *
     * `bankRows` is scoped to the currency the *server* currently holds for this
     * draft, so it can only judge the account when the template does not change
     * the currency. When it does, the list on hand is the old currency's and
     * would reject a perfectly good account — the new list arrives after the
     * autosave lands, and the payment card resolves it then. Keeping it is
     * therefore right in that case, and dropping a genuinely stale one is right
     * in the other: the card reads as unselected and Generate blocks on it,
     * rather than the form quietly holding an account nobody can see.
     */
    const currencyChanged = !!next.currency && next.currency !== form.currency;
    const accountKept =
      currencyChanged || bankRows.some((row) => row.accountNumber === next.accountNo);

    setForm((prev) => ({
      ...prev,
      ...next,
      accountNo: accountKept ? (next.accountNo ?? "") : "",
      dueTermId: carriesTerm ? next.dueTermId : prev.dueTermId,
      dueDate: carriesTerm ? dueDateForTerm(prev.invoiceDate, next.dueTermId) : prev.dueDate,
    }));

    setActiveTemplateId(template.id);
    // Only count a genuine use. Re-applying the template already in force is a
    // reset, not a use, and counting it inflated the "most used" badge.
    if (template.id !== activeTemplateId) templateStore.recordUsage(template.id);

    // Ordered by how much it blocks the merchant: a missing account or start date
    // stops Generate outright, so those are worth saying over the reassurance.
    const followUp = !accountKept
      ? "Pick a receiving account: the saved one is not available in this currency."
      : next.isRecurring && !form.recurringStartDate
        ? "Set the recurring start date: a schedule cannot be reused from a template."
        : "Client, invoice number and dates are unchanged.";

    toast.success(`Applied "${template.name}"`, { description: followUp });
  };

  const handleSaveTemplate = (name: string) => {
    const id = templateStore.save(name, toTemplateSnapshot(form));
    setActiveTemplateId(id);
    toast.success("Template saved", { description: `"${name}" is ready to reuse.` });
  };

  const handleUpdateTemplate = () => {
    if (!activeTemplate) return;
    templateStore.update(activeTemplate.id, toTemplateSnapshot(form));
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
    setActiveTemplateId(null);
    toast.success("Detached from template", {
      description: `This invoice is no longer linked to "${activeTemplate.name}". Nothing on it changed.`,
    });
  };

  const handleDeleteTemplate = (templateId: string) => {
    templateStore.remove(templateId);
    // The invoice keeps its content; it just no longer descends from anything.
    if (templateId === activeTemplateId) setActiveTemplateId(null);
    toast.success("Template deleted");
  };

  // ── Branding actions ───────────────────────────────────────────────────────

  /** Picking a theme also adopts its colours, which is what makes it a theme. */
  const handleStyleChange = (brandingStyleId: string) => {
    const style = INVOICE_BRANDING_STYLES.find((candidate) => candidate.id === brandingStyleId);
    patch({
      brandingStyleId,
      ...(style && {
        primaryColor: style.defaultPrimaryColor,
        accentColor: style.defaultAccentColor,
      }),
    });
  };

  const handleResetColors = () => {
    const style =
      INVOICE_BRANDING_STYLES.find((candidate) => candidate.id === form.brandingStyleId) ??
      DEFAULT_BRANDING_STYLE;
    patch({
      primaryColor: style.defaultPrimaryColor,
      accentColor: style.defaultAccentColor,
    });
  };

  /**
   * One cropper serves both assets and both entry points (the branding panel and
   * the placeholder on the document), so there is a single upload path and a
   * single busy state per asset.
   */
  const handleCroppedUpload = (file: File) => {
    if (cropperType === "SIGNATURE") {
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

        {/* Nova's split button, restored. The menu offers exactly one of "Save
            as template" or "Update template" depending on whether this invoice
            came from one, because offering both invites the merchant to guess
            which of the two they want. */}
        <SplitButton
          label={isGenerating ? "Generating…" : "Generate invoice"}
          variant="primary"
          size="sm"
          disabled={isSaving || isGenerating}
          onClick={handleGenerate}
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
            <SplitButtonItem
              className="whitespace-nowrap"
              disabled={!hasTemplatableContent}
              onClick={() => setSaveTemplateOpen(true)}
            >
              Save as template
            </SplitButtonItem>
          )}
          <SplitButtonItem
            className="whitespace-nowrap"
            disabled={templateStore.templates.length === 0}
            onClick={() => setManageTemplatesOpen(true)}
          >
            Manage templates
          </SplitButtonItem>
        </SplitButton>
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
            <InvoicePreviewSidebar
              source={previewSource}
              onLogoClick={() => setCropperType("LOGO")}
            />
            <BrandingSection
              logoEnabled={form.logoEnabled}
              signatureEnabled={form.signatureEnabled}
              brandingStyleId={form.brandingStyleId}
              primaryColor={form.primaryColor}
              accentColor={form.accentColor}
              language={form.language}
              logo={logo}
              signature={signature}
              onChange={patch}
              onStyleChange={handleStyleChange}
              onResetColors={handleResetColors}
              onOpenCropper={setCropperType}
            />
          </div>
        </div>
      </div>

      <SaveAsTemplateDialog
        open={saveTemplateOpen}
        onOpenChange={setSaveTemplateOpen}
        snapshot={hasTemplatableContent ? toTemplateSnapshot(form) : null}
        existingNames={templateStore.templates.map((template) => template.name)}
        onSave={handleSaveTemplate}
      />

      <ManageTemplatesDialog
        open={manageTemplatesOpen}
        onOpenChange={setManageTemplatesOpen}
        templates={templateStore.templates}
        onRename={templateStore.rename}
        onDelete={handleDeleteTemplate}
      />

      <LogoUploadDialog
        open={!!cropperType}
        onOpenChange={(open) => setCropperType(open ? cropperType : null)}
        label={cropperType === "SIGNATURE" ? "Signature" : "Logo"}
        isUploading={cropperType === "SIGNATURE" ? signature.isUploading : logo.isUploading}
        onUpload={handleCroppedUpload}
      />
    </>
  );
}
