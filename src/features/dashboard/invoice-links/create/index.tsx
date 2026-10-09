"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Button,
  DatePicker,
  Field,
  FieldError,
  FieldLabel,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  SplitButton,
  SplitButtonItem,
  StatusBadge,
  Switch,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { MidGuard } from "@/components/common/MidGuard";
import { brandBackdropStyle, INVOICE_PREVIEW_BACKDROP } from "@/lib/utils/brandBackdrop";
import { SelectMidView } from "@/components/common/SelectMidView";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { useAccountSetup } from "@/stores/useAccountSetup";
// Presentational only (ui + Icon + cn), so it is safe to borrow across
// features — the same way mca-links borrows CountryCell from mca-transactions.
import { ChipField } from "@/features/dashboard/create-invoice/components/InvoiceHeaderChips";
import {
  ReadinessChecklist,
  type InvoiceRequirement,
} from "@/features/dashboard/create-invoice/components/ReadinessChecklist";
// Lists, renames and deletes templates; reads only id/name/description/dates,
// so it serves the shared template store from here as well.
import { ManageTemplatesDialog } from "@/features/dashboard/create-invoice/components/ManageTemplatesDialog";
import { INVOICE_LINKS_FEATURE } from "@/features/dashboard/invoice-links/constants";
import { useInvoiceLinkMidScope } from "@/features/dashboard/invoice-links/hooks";
import { DEFAULT_CALLING_CODE } from "@/features/dashboard/invoice-links/create/constants";
import {
  addressFieldValues,
  applyTemplate,
  buildBulkInvoiceRequest,
  buildInvoiceRequest,
  customerFromRecipient,
  emptyAddress,
  getTotalAmount,
  hasTemplatableContent,
  localDateKey,
  toTemplateWriteBody,
  validateAddress,
  validateDiscount,
  validateDueDate,
  validateEmail,
  validateFullName,
  validateInvoiceNo,
  validateLineItem,
  validatePhone,
  validateRecipient,
  validateRequiredAddress,
  type LineItemErrors,
} from "@/features/dashboard/invoice-links/create/helpers";
import {
  useCreateInvoice,
  useCreateInvoiceBatch,
  useEditInvoice,
  useInvoiceCountries,
  useInvoiceCurrencies,
  useInvoiceDraft,
  useInvoiceEditorMid,
  useImportItemsToSku,
  useInvoiceLinkConfig,
  useRequiredAddresses,
  useInvoiceLinkTemplates,
  useInvoiceLogo,
  useMerchantShortName,
  useSaveInvoiceDraft,
} from "@/features/dashboard/invoice-links/create/hooks";
import { AddressFields } from "@/features/dashboard/invoice-links/create/components/AddressFields";
import { BatchResultsDialog } from "@/features/dashboard/invoice-links/create/components/BatchResultsDialog";
import { CreatedLinkDialog } from "@/features/dashboard/invoice-links/create/components/CreatedLinkDialog";
import { EditorSection } from "@/features/dashboard/invoice-links/create/components/EditorSection";
import { InvoicePreview } from "@/features/dashboard/invoice-links/create/components/InvoicePreview";
import { LineItemsSection } from "@/features/dashboard/invoice-links/create/components/LineItemsSection";
import { RecipientsSection } from "@/features/dashboard/invoice-links/create/components/RecipientsSection";
import { SaveTemplateDialog } from "@/features/dashboard/invoice-links/create/components/SaveTemplateDialog";
import {
  ApplyTemplateConfirm,
  TemplatePicker,
} from "@/features/dashboard/invoice-links/create/components/TemplatePicker";
import type {
  AddressValues,
  InvoiceBulkResult,
  InvoiceDraftResponse,
  InvoiceFormValues,
  InvoiceLineItem,
  InvoiceLinkTemplate,
  InvoiceRecipient,
} from "@/features/dashboard/invoice-links/create/types";

type DraftRequest = NonNullable<
  NonNullable<InvoiceDraftResponse["data"]["invoice-data"]>["invoiceRequest"]
>;

/** Accepts both vocabularies: billing comes back remapped, shipping raw. See helpers.ts. */
/** A country name reduced to letters only, for matching across spellings. */
function normaliseCountry(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

/** ISO2 code → the country name the address form holds. Anything else passes through. */
type CountryNameOf = (country: string) => string;

function toAddress(
  src: Record<string, string | null> | null | undefined,
  countryName: CountryNameOf
): AddressValues {
  return {
    streetAddress: src?.addressStreet1 ?? src?.streetAddress ?? "",
    landmark: src?.addressStreet2 ?? src?.landmark ?? "",
    // Stored as an ISO2 code since the gcc-shaped body; older drafts hold the name.
    country: countryName(src?.addressCountry ?? src?.country ?? ""),
    state: src?.addressState ?? src?.state ?? "",
    city: src?.addressCity ?? src?.city ?? "",
    zipcode: src?.addressPostalCode ?? src?.zipcode ?? "",
  };
}

/** "DD/MM/YYYY HH:mm:ss" (how it is stored) → "yyyy-mm-dd" (what the date control wants). */
function toDateInputValue(raw: string | null | undefined): string {
  if (!raw) return "";
  const [dd, mm, yyyy] = raw.split(" ")[0]?.split("/") ?? [];
  return dd && mm && yyyy ? `${yyyy}-${mm}-${dd}` : "";
}

/** "Nobody picked", for the draft body and the preview's empty state. */
const EMPTY_RECIPIENT: InvoiceRecipient = {
  key: "",
  clientId: null,
  fullName: "",
  contactName: "",
  emailId: "",
  callingCode: DEFAULT_CALLING_CODE,
  phoneNumber: "",
  billing: emptyAddress(),
  shipping: null,
};

function emptyValues(): InvoiceFormValues {
  return {
    txnCurrency: "",
    invoiceNo: "",
    dueDate: "",
    discountType: "fixed",
    discount: "",
    merchantNote: "",
    memo: "",
    fullName: "",
    emailId: "",
    callingCode: DEFAULT_CALLING_CODE,
    phoneNumber: "",
    billing: emptyAddress(),
    shipping: emptyAddress(),
    // Upstream's initialValue for "Repeat for Shipping Address?" is true.
    shippingSameAsBilling: true,
  };
}

/** The saved invoice as form values. Pure, so it can be derived rather than synced in an effect. */
/** Whether a stored shipping address is just the billing one again. */
function mirrorsBilling(shipping: AddressValues, billing: AddressValues): boolean {
  return (Object.keys(shipping) as (keyof AddressValues)[]).every(
    (key) => !shipping[key] || shipping[key] === billing[key]
  );
}

function requestToValues(
  request: DraftRequest | undefined,
  invoiceId: string | undefined,
  countryName: CountryNameOf
): InvoiceFormValues {
  if (!request) return emptyValues();

  const data = request.invoiceRequestData ?? {};
  const customer = request.plCustomerData ?? {};
  const shipping = request.plShippingData ?? null;

  return {
    txnCurrency: data.txnCurrency || "",
    invoiceNo: data.invoiceId || invoiceId || "",
    dueDate: toDateInputValue(data.formattedDueDate),
    // Upstream infers the type from whichever of the two fields came back.
    discountType: data.discountPercent ? "percentage" : "fixed",
    discount: data.discountPercent || data.discountAmount || "",
    merchantNote: data.additionalInfo || "",
    memo: data.memo || "",
    fullName: customer.fullName || "",
    emailId: customer.emailId || "",
    callingCode: customer.callingCode || DEFAULT_CALLING_CODE,
    phoneNumber: customer.phoneNumber || "",
    billing: toAddress(request.plBillingData, countryName),
    shipping: toAddress(shipping, countryName),
    // The gcc-shaped shipping block carries no name, so "same as billing" is
    // read from the addresses themselves: none stored, or the billing one again.
    shippingSameAsBilling:
      !shipping ||
      mirrorsBilling(
        toAddress(shipping, countryName),
        toAddress(request.plBillingData, countryName)
      ),
  };
}

/**
 * The customer a draft was saved with, as a recipient. Drafts store a
 * customer, not a client id, so this is shown as its own row rather than
 * matched against the client book by name or email.
 */
function requestToRecipients(
  request: DraftRequest | undefined,
  countryName: CountryNameOf
): InvoiceRecipient[] {
  const customer = request?.plCustomerData;
  if (!customer?.fullName && !customer?.emailId) return [];
  const shipping = request?.plShippingData ?? null;

  return [
    {
      key: "draft",
      clientId: null,
      fullName: customer.fullName || "",
      contactName: "",
      emailId: customer.emailId || "",
      callingCode: customer.callingCode || DEFAULT_CALLING_CODE,
      phoneNumber: customer.phoneNumber || "",
      billing: toAddress(request?.plBillingData, countryName),
      // Same rule as requestToValues.
      shipping:
        !shipping ||
        mirrorsBilling(
          toAddress(shipping, countryName),
          toAddress(request?.plBillingData, countryName)
        )
          ? null
          : toAddress(shipping, countryName),
    },
  ];
}

function requestToItems(request: DraftRequest | undefined): InvoiceLineItem[] {
  const rows = (request?.invoiceRequestData?.invoiceItems ?? []).map((it, index) => ({
    key: `item-${index}`,
    description: it.itemDescription || "",
    itemCode: it.itemCode || "",
    ppu: it.itemPrice || "0",
    qty: it.quantity || "0",
    tax: it.gstPercentage || "0",
  }));
  // A new invoice starts with no rows: items are added through the dialog, and
  // a blank placeholder row would read as an "Untitled item" already billed.
  return rows;
}

/**
 * Create / edit an invoice link.
 *
 * The DATA is pg-dashboard's `CreateMcaPaymentInvoice` with `page="INVOICE"` —
 * PA product, `/v1/customer-data/invoice/*`, and the payload, validation and
 * create/edit/draft branching all ported from there.
 *
 * The SHAPE is this app's invoice-management editor (create-invoice): the
 * full-bleed editor shell, the captioned chip row for invoice number and due
 * date, section cards with tinted icon chips, the line-items table with the
 * currency select in its header, optional sections collapsed by default, and
 * the live document preview filling the right column. Production's numbered
 * accordion is deliberately not reproduced — the two invoice editors in this
 * app should read as one product, and presentation is the layer a migration is
 * allowed to change.
 *
 * Three write paths, branching exactly as upstream does (index.tsx:133):
 *
 *   invoiceId && status !== "DRAFT"  → PUT  …/edit     (an issued invoice)
 *   otherwise                        → POST …          (create, incl. issuing a draft)
 *   "Save as draft"                  → POST/PUT …/draft
 *
 * Creating (and issuing a draft) bills clients from the client book, one or
 * many. One client sends the single-customer body exactly as before; several
 * add `clients[]` to the same POST and the backend issues one link each, with
 * -1, -2, … appended to the invoice number. Editing an issued invoice keeps
 * the typed customer fields: it is one existing link and cannot fan out.
 *
 * Templates are the MCA invoice template store, shared. Applying one fills the
 * line items, currency, discount, memo, note and due date from a fresh read of
 * the template, which is where the backend substitutes live SKU prices.
 */
export function InvoiceLinkEditorFeature({ invoiceId }: { invoiceId?: string }) {
  const router = useRouter();
  const { needsMidChoice, midOptions } = useInvoiceLinkMidScope();
  const setSelectedMidDetails = useAccountSetup((s) => s.setSelectedMidDetails);
  const mid = useInvoiceEditorMid();
  // gcc-ui-temp only lets a merchant create an invoice link when their invoice
  // config has `merchantInvoiceEnabled`. Checked here, for the MID the link
  // will be raised under, rather than on the list's button: the list may span
  // several MIDs, and only once one is chosen is there a single config to ask.
  // Not read while a MID is still to be picked.
  const { isInvoiceEnabled } = useInvoiceLinkConfig(needsMidChoice ? "" : mid);

  const shell = (body: ReactNode) => (
    <>
      <header className="flex shrink-0 flex-wrap items-center gap-4 border-b border-border px-5 py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Close"
          className="h-9 w-9 shrink-0 p-0"
          onClick={() => router.push("/invoice-links")}
        >
          <Icon name="x" className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {invoiceId ? "Edit invoice link" : "Create an invoice link"}
        </h1>
      </header>
      <div className="mx-auto w-full max-w-2xl px-6 py-16">{body}</div>
    </>
  );

  /**
   * The editor cannot open without knowing which account the link is for:
   * every endpoint below puts a MID in its path, and pg-dashboard falls back
   * to `paMids[0]`, raising the link under an account the merchant never
   * chose. The in-app entry points (the list's Create, a row's Edit, "Edit"
   * in Manage templates) already settle it before navigating, so this only
   * catches the header search's ?action=create, a pasted link or a bookmark.
   * Same gate as /create-invoice; the editor's hooks do not fire until it is
   * answered.
   */
  if (needsMidChoice) {
    return shell(<SelectMidView midType="PA" midOptions={midOptions} showSidebarHint={false} />);
  }

  // Create only: gcc gates the Create action, not editing an existing link.
  // Held back on an explicit false alone — while the config loads, or if it
  // fails, the editor opens as before rather than a hiccup locking it.
  if (!invoiceId && isInvoiceEnabled === false) {
    return shell(
      <PlaceholderState
        variant="empty-table"
        title="Invoice links aren't switched on for this account"
        description="Contact your account manager to enable invoice links for this Merchant ID."
        className="rounded-xl border border-border bg-card py-16"
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            {midOptions.length > 1 ? (
              // Clearing the selection brings back the account picker above.
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedMidDetails({ mid: "", status: "", color: "" })}
              >
                Choose another account
              </Button>
            ) : null}
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => router.push("/invoice-links")}
            >
              Back to Invoice Links
            </Button>
          </div>
        }
      />
    );
  }

  return <InvoiceLinkEditor invoiceId={invoiceId} />;
}

function InvoiceLinkEditor({ invoiceId }: { invoiceId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  // "Edit" in the list's Manage templates lands here with ?templateId=, which
  // is applied once below. Never on an existing invoice.
  const initialTemplateId = invoiceId ? null : searchParams.get("templateId");
  const mid = useInvoiceEditorMid();
  const currencies = useInvoiceCurrencies();
  // gcc-ui-temp's merchant configs (features/Invoice/helper.js).
  const invoiceConfig = useInvoiceLinkConfig(mid);
  const requiredAddresses = useRequiredAddresses(mid);
  // gcc-ui-temp sends `addressCountry` as an ISO2 code; the form holds names.
  const countries = useInvoiceCountries();
  // Matched ignoring case and punctuation: the client book and this list do
  // not always spell a country identically ("Korea, Republic of" vs …).
  const countryCode = useCallback(
    (name: string) => {
      const key = normaliseCountry(name);
      return countries.find((c) => normaliseCountry(c.value) === key)?.iso2 || name;
    },
    [countries]
  );
  const countryName = useCallback(
    (value: string) => countries.find((c) => c.iso2 === value)?.value || value,
    [countries]
  );
  const merchantName = useMerchantShortName(mid);
  const {
    displayUrl: logoUrl,
    upload: uploadLogo,
    isUploading: isLogoUploading,
    merchantLogo,
  } = useInvoiceLogo(mid);

  // Derived state, not synced state: `edits` holds only what the merchant has
  // changed, and the rendered values are the server's draft with those laid
  // over. Seeding state from the query in an effect instead would both break
  // the React Compiler's no-setState-in-effect rule and let a refetch clobber
  // unsaved edits.
  const [edits, setEdits] = useState<Partial<InvoiceFormValues>>({});
  const [itemsOverride, setItemsOverride] = useState<InvoiceLineItem[] | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [itemErrors, setItemErrors] = useState<Record<string, LineItemErrors>>({});
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  // Null until the merchant touches the picker; until then a draft's own
  // customer (if any) is the selection. Same derived-state idea as `edits`.
  const [recipientsOverride, setRecipientsOverride] = useState<InvoiceRecipient[] | null>(null);
  const [recipientsError, setRecipientsError] = useState<string | undefined>(undefined);
  // The batch outcome, with the recipients in the order they were sent so
  // each result can be matched to its client.
  const [batch, setBatch] = useState<{
    results: InvoiceBulkResult[];
    recipients: InvoiceRecipient[];
  } | null>(null);
  // Which template this invoice came from, this session. Null is "none".
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [confirmTemplate, setConfirmTemplate] = useState<InvoiceLinkTemplate | null>(null);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [manageTemplatesOpen, setManageTemplatesOpen] = useState(false);
  // The pending-fields checklist beside Create, as in create-invoice: shown
  // once a press could not go through, then kept so it updates as things are
  // filled in.
  const [checklistRevealed, setChecklistRevealed] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  // Lazy initialisers, not render-time reads: the React Compiler rules ban
  // calling the clock during render.
  const [todayKey] = useState(() => new Date().toISOString().slice(0, 10));
  const [todayLabel] = useState(() =>
    new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  );

  const { data: draft } = useInvoiceDraft(mid, invoiceId);
  const { mutate: createInvoice, isPending: isCreating } = useCreateInvoice(mid);
  const { mutate: createBatch, isPending: isCreatingBatch } = useCreateInvoiceBatch(mid);
  const { mutate: editInvoice, isPending: isEditing } = useEditInvoice(mid);
  const { mutate: saveDraft, isPending: isSavingDraft } = useSaveInvoiceDraft(mid, invoiceId);
  const templateStore = useInvoiceLinkTemplates(mid);
  const importItemsToSku = useImportItemsToSku(mid);

  const isEditingIssued = !!invoiceId && status !== "DRAFT";
  /** Every path but editing an issued link bills clients from the picker. */
  const usesClientPicker = !isEditingIssued;

  const request = draft?.data?.["invoice-data"]?.invoiceRequest;
  const serverValues = useMemo(
    () => requestToValues(request, invoiceId, countryName),
    [request, invoiceId, countryName]
  );
  const serverItems = useMemo(() => requestToItems(request), [request]);
  const serverRecipients = useMemo(
    () => requestToRecipients(request, countryName),
    [request, countryName]
  );
  const recipients = recipientsOverride ?? serverRecipients;
  const isBatch = usesClientPicker && recipients.length > 1;

  const updateRecipients = (update: (prev: InvoiceRecipient[]) => InvoiceRecipient[]) => {
    setRecipientsError(undefined);
    setRecipientsOverride((prev) => update(prev ?? serverRecipients));
  };

  const values = useMemo(() => {
    const merged = { ...serverValues, ...edits };
    // Upstream's `initialValue: currencyOptions[0].value` — derived rather than
    // written back into state once the currency list resolves.
    return { ...merged, txnCurrency: merged.txnCurrency || currencies[0]?.value || "" };
  }, [serverValues, edits, currencies]);

  // A required shipping address that is "same as billing" is the billing one,
  // so billing is held to it too — gcc copies billing into shipping then.
  const billingRequired =
    requiredAddresses.billing || (requiredAddresses.shipping && values.shippingSameAsBilling);
  const shippingRequired = requiredAddresses.shipping && !values.shippingSameAsBilling;

  // Untouched rows come from the server; the moment the merchant edits the
  // grid their copy wins outright.
  const items = itemsOverride ?? serverItems;

  // Amounts render with the currency's SYMBOL, not its code.
  const currencySymbol =
    currencies.find((c) => c.value === values.txnCurrency)?.symbol || values.txnCurrency;

  const patch = (next: Partial<InvoiceFormValues>) => {
    setEdits((prev) => ({ ...prev, ...next }));
    // An edited field's error goes with the edit, so a message never sits
    // under a field that now holds a valid value. Nested ones too: editing
    // `billing` clears every `billing.*` error. Submit re-checks everything.
    const touched = Object.keys(next);
    setErrors((prev) => {
      const stale = Object.keys(prev).filter((key) =>
        touched.some((field) => key === field || key.startsWith(`${field}.`))
      );
      if (stale.length === 0) return prev;
      const rest = { ...prev };
      for (const key of stale) delete rest[key];
      return rest;
    });
  };

  function validate(): boolean {
    const next: Record<string, string> = {};

    const invoiceNo = validateInvoiceNo(values.invoiceNo);
    if (invoiceNo) next.invoiceNo = invoiceNo;
    const dueDate = validateDueDate(values.dueDate);
    if (dueDate) next.dueDate = dueDate;
    const discount = validateDiscount(values.discount, values.discountType);
    if (discount) next.discount = discount;

    let recipientsOk = true;
    if (usesClientPicker) {
      // The per-client problems are already on screen under each client; this
      // only has to refuse, and say so when nobody is picked at all.
      if (recipients.length === 0) {
        setRecipientsError("Choose at least one client");
        recipientsOk = false;
      } else if (recipients.some((r) => validateRecipient(r, requiredAddresses).length > 0)) {
        recipientsOk = false;
      }
    } else {
      const fullName = validateFullName(values.fullName);
      if (fullName) next.fullName = fullName;
      const emailId = validateEmail(values.emailId);
      if (emailId) next.emailId = emailId;
      const phoneNumber = validatePhone(values.phoneNumber);
      if (phoneNumber) next.phoneNumber = phoneNumber;

      const billingErrors = validateRequiredAddress(values.billing, billingRequired);
      Object.entries(billingErrors).forEach(([k, v]) => v && (next[`billing.${k}`] = v));
      if (!values.shippingSameAsBilling) {
        const shippingErrors = validateRequiredAddress(values.shipping, shippingRequired);
        Object.entries(shippingErrors).forEach(([k, v]) => v && (next[`shipping.${k}`] = v));
      }
    }

    if (items.length === 0) next.items = "Add at least one item";

    const nextItemErrors: Record<string, LineItemErrors> = {};
    items.forEach((item) => {
      const rowErrors = validateLineItem(item);
      if (Object.keys(rowErrors).length > 0) nextItemErrors[item.key] = rowErrors;
    });

    setErrors(next);
    setItemErrors(nextItemErrors);
    return (
      recipientsOk && Object.keys(next).length === 0 && Object.keys(nextItemErrors).length === 0
    );
  }

  /**
   * "Save to SKU catalogue" lines go to the catalogue the moment the merchant
   * submits, as pg-dashboard imports on leaving its Items step: before, and
   * whatever the outcome of, the create. Waiting for a successful create lost
   * them whenever the create failed. Once saved they are un-ticked, so a retry
   * after a failed create does not import them twice.
   */
  const saveTickedItemsToSku = () =>
    importItemsToSku(items, values.txnCurrency, () =>
      setItemsOverride((prev) =>
        (prev ?? items).map((item) => (item.saveAsSku ? { ...item, saveAsSku: false } : item))
      )
    );

  /**
   * What Create still needs, for the checklist beside it. Built from the same
   * validators as validate(), so the list and the press can never disagree.
   */
  const requirement = (
    id: string,
    label: string,
    fieldId: string | null,
    problem: string | null | undefined,
    met: string
  ): InvoiceRequirement => ({ id, label, fieldId, done: !problem, detail: problem || met });

  const recipientsLoading = recipients.filter((r) => r.detailsStatus === "loading").length;
  const recipientIssues = recipients.filter(
    (r) => validateRecipient(r, requiredAddresses).length > 0
  ).length;
  const itemsTotal = getTotalAmount(items, values.discount || "0", values.discountType);
  const itemRowsInvalid = items.some((item) => Object.keys(validateLineItem(item)).length > 0);
  const billingInvalid = Object.values(
    validateRequiredAddress(values.billing, billingRequired)
  ).some(Boolean);
  const shippingInvalid =
    !values.shippingSameAsBilling &&
    Object.values(validateRequiredAddress(values.shipping, shippingRequired)).some(Boolean);

  const requirements: InvoiceRequirement[] = [
    requirement(
      "invoice-number",
      "Invoice number",
      "invoice-number",
      validateInvoiceNo(values.invoiceNo),
      values.invoiceNo
    ),
    requirement(
      "due-date",
      "Due date",
      "due-date",
      validateDueDate(values.dueDate),
      values.dueDate
    ),
    usesClientPicker
      ? requirement(
          "recipients",
          "Who you're billing",
          "recipients",
          recipients.length === 0
            ? "Pick at least one client."
            : recipientsLoading > 0
              ? "Loading client details…"
              : recipientIssues > 0
                ? `${recipientIssues} client${recipientIssues === 1 ? " needs" : "s need"} details completed.`
                : null,
          recipients.length === 1
            ? recipients[0].fullName
            : `${recipients.length} clients, one link each.`
        )
      : requirement(
          "recipients",
          "Who you're billing",
          "recipients",
          validateFullName(values.fullName) ||
            validateEmail(values.emailId) ||
            validatePhone(values.phoneNumber),
          values.fullName
        ),
    requirement(
      "line-items",
      "Line items",
      "line-items",
      items.length === 0
        ? "Add at least one thing you are billing for."
        : itemRowsInvalid
          ? "Every line needs a description, price and quantity."
          : validateDiscount(values.discount, values.discountType),
      `${items.length} item${items.length === 1 ? "" : "s"}, totalling ${currencySymbol}${itemsTotal}.`
    ),
    // Only the typed customer has an address form here; it is optional, but a
    // half-filled one is checked.
    ...(usesClientPicker
      ? []
      : [
          requirement(
            "address",
            "Billing and shipping",
            "address",
            billingInvalid || shippingInvalid ? "Fix the highlighted address fields." : null,
            [...addressFieldValues(values.billing), ...addressFieldValues(values.shipping)].some(
              (v) => v.trim()
            )
              ? "Filled in."
              : "Optional, left blank."
          ),
        ]),
  ];

  const onSubmit = () => {
    // The checklist names every outstanding item at once, each one a jump to
    // its field, which the toast it replaces could not. The inline errors are
    // still set by validate().
    if (!validate()) {
      setChecklistRevealed(true);
      setChecklistOpen(true);
      return;
    }
    saveTickedItemsToSku();
    const handlers = {
      onSuccess: (res: { data?: { paymentLink?: string } }) =>
        setCreatedLink(res?.data?.paymentLink ?? ""),
      onError: (error: Error) => toast.error(error?.message || "Failed to create link"),
    };

    if (isEditingIssued) {
      editInvoice(
        buildInvoiceRequest(values, items, undefined, countryCode, merchantLogo),
        handlers
      );
      return;
    }

    if (recipients.length === 1) {
      createInvoice(
        buildInvoiceRequest(
          values,
          items,
          customerFromRecipient(recipients[0]),
          countryCode,
          merchantLogo
        ),
        handlers
      );
      return;
    }

    const sent = recipients;
    createBatch(buildBulkInvoiceRequest(values, items, sent, countryCode, merchantLogo), {
      onSuccess: (res) => setBatch({ results: res?.data?.results ?? [], recipients: sent }),
      onError: (error: Error) => toast.error(error?.message || "Failed to create links"),
    });
  };

  // Upstream does not validate before saving a draft — a draft is by definition
  // incomplete — so neither does this.
  //
  // A draft holds one customer, so with the picker it saves the one client
  // picked, or none; with several picked the button is held (see header).
  const onSaveDraft = () => {
    const customer = usesClientPicker
      ? recipients[0]
        ? customerFromRecipient(recipients[0])
        : customerFromRecipient(EMPTY_RECIPIENT)
      : undefined;
    saveTickedItemsToSku();
    saveDraft(buildInvoiceRequest(values, items, customer, countryCode, merchantLogo), {
      onSuccess: () => {
        toast.success("Draft saved");
        router.push("/invoice-links");
      },
      onError: (error: Error) => toast.error(error?.message || "Failed to save draft"),
    });
  };

  const isBusy = isCreating || isEditing || isCreatingBatch;
  const draftBlocked = isBatch;

  // ── Templates ──────────────────────────────────────────────────────────────

  const activeTemplate =
    templateStore.templates.find((template) => template.id === activeTemplateId) ?? null;
  const canSaveTemplate = hasTemplatableContent(values, items);

  const applyChosenTemplate = (template: InvoiceLinkTemplate) => {
    setConfirmTemplate(null);
    loadTemplate(template);
  };

  const loadTemplate = (template: InvoiceLinkTemplate) => {
    // Read fresh rather than applying the list row: the read is where SKU-backed
    // lines get the catalogue's current name and price.
    templateStore.load(template.id, (fresh) => {
      const { patch: next, items: nextItems } = applyTemplate(fresh, localDateKey(new Date()));
      const currencyOffered =
        !next.txnCurrency || currencies.some((option) => option.value === next.txnCurrency);
      if (!currencyOffered) delete next.txnCurrency;

      patch(next);
      setItemsOverride(nextItems);
      setItemErrors({});
      setActiveTemplateId(template.id);
      toast.success(`Applied "${template.name}"`, {
        description: currencyOffered
          ? undefined
          : `${fresh.currency} is not offered for invoice links, so the currency was left as it was.`,
      });
    });
  };

  const chooseTemplate = (template: InvoiceLinkTemplate) => {
    if (canSaveTemplate) setConfirmTemplate(template);
    else applyChosenTemplate(template);
  };

  // ?templateId= from the list's Manage templates, applied exactly once. Held
  // until the template list and the currencies have both arrived: the first
  // says what the id is called, the second is what the currency check reads.
  // A fresh form has nothing to overwrite, so there is no confirm.
  const initialTemplateHandled = useRef(false);
  useEffect(() => {
    if (!initialTemplateId || initialTemplateHandled.current) return;
    if (!templateStore.isReady || currencies.length === 0) return;
    initialTemplateHandled.current = true;
    const template = templateStore.templates.find((t) => t.id === initialTemplateId);
    if (template) loadTemplate(template);
    else toast.error("Couldn't find that template", { description: "It may have been deleted." });
  });

  const handleSaveTemplate = (name: string) => {
    templateStore.save(
      toTemplateWriteBody(name, values, items, localDateKey(new Date())),
      (templateId) => {
        setActiveTemplateId(templateId);
        setSaveTemplateOpen(false);
        toast.success("Template saved", { description: `"${name}" is ready to reuse.` });
      }
    );
  };

  const handleUpdateTemplate = () => {
    if (!activeTemplate) return;
    templateStore.replace(
      activeTemplate.id,
      toTemplateWriteBody(
        activeTemplate.name,
        values,
        items,
        localDateKey(new Date()),
        activeTemplate.raw
      ),
      () =>
        toast.success("Template updated", {
          description: `"${activeTemplate.name}" now matches this invoice.`,
        })
    );
  };

  const handleDeleteTemplate = (templateId: string) => {
    templateStore.remove(templateId);
    if (templateId === activeTemplateId) setActiveTemplateId(null);
  };

  // What the preview shows: the first picked client, standing in for all of
  // them, since every link in a batch carries the same invoice.
  const previewRecipient = usesClientPicker ? recipients[0] : undefined;
  const previewValues: InvoiceFormValues = usesClientPicker
    ? {
        ...values,
        ...customerFromRecipient(previewRecipient ?? EMPTY_RECIPIENT),
      }
    : values;

  // Counts for the collapsed sections' subtitles, so shut sections still say
  // what is inside them.
  const addressFilled = [
    ...addressFieldValues(values.billing),
    ...(values.shippingSameAsBilling ? [] : addressFieldValues(values.shipping)),
  ].filter((v) => v.trim()).length;
  const notesFilled = [values.memo, values.merchantNote].filter((v) => v.trim()).length;

  const hasAddressError = Object.keys(errors).some(
    (k) => k.startsWith("billing.") || k.startsWith("shipping.")
  );

  return (
    <MidGuard productType="PA" feature={INVOICE_LINKS_FEATURE}>
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 flex-wrap items-center gap-4 border-b border-border px-5 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Close"
            className="h-9 w-9 shrink-0 p-0"
            onClick={() => router.push("/invoice-links")}
          >
            <Icon name="x" className="h-4 w-4" />
          </Button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {invoiceId ? "Edit invoice link" : "Create an invoice link"}
              </h1>
              {invoiceId && status ? (
                <StatusBadge
                  variant={status.toUpperCase() === "DRAFT" ? "muted" : "info"}
                  label={status.toUpperCase() === "DRAFT" ? "Draft" : "Issued"}
                  size="sm"
                />
              ) : null}
            </div>
          </div>

          {draftBlocked ? (
            // A draft holds one customer. Held rather than hidden, and it says
            // why: a disabled button with no reason reads as a broken one.
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button type="button" variant="outline" size="sm" disabled>
                    Save as Draft
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                A draft can hold one client. Keep one, or create the links now.
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSavingDraft || isBusy}
              onClick={onSaveDraft}
            >
              {isSavingDraft ? "Saving…" : "Save as Draft"}
            </Button>
          )}

          {/* Immediately left of Create, as in create-invoice: the answer to
              the question that button raises. */}
          {checklistRevealed && (
            <ReadinessChecklist
              requirements={requirements}
              open={checklistOpen}
              onOpenChange={setChecklistOpen}
              copy={{
                verb: isEditingIssued ? "update" : "create",
                done: isEditingIssued ? "updated" : "created",
                subject: "this invoice link",
              }}
            />
          )}

          {/* The MCA editor's split button: the primary action, with the
              template actions in its menu. Exactly one of "Save as template" or
              "Update ⟨name⟩" is offered, depending on whether this invoice came
              from a template. */}
          <SplitButton
            label={
              isBusy
                ? "Working…"
                : isBatch
                  ? `Create ${recipients.length} invoice links`
                  : invoiceId
                    ? "Update invoice link"
                    : "Create invoice link"
            }
            variant="primary"
            size="sm"
            disabled={isBusy}
            onClick={onSubmit}
            // Squares the facing corners so the pair reads as one control; see
            // the same className on create-invoice's SplitButton for why
            // flux's own rounded-r-none does not take.
            className="[&>button+button]:rounded-l-none [&>button:first-child]:rounded-r-none"
          >
            {activeTemplate ? (
              <>
                <SplitButtonItem
                  className="max-w-[18rem] truncate whitespace-nowrap"
                  disabled={templateStore.isMutating}
                  onClick={handleUpdateTemplate}
                >
                  Update &ldquo;{activeTemplate.name}&rdquo;
                </SplitButtonItem>
                <SplitButtonItem
                  className="whitespace-nowrap"
                  onClick={() => setActiveTemplateId(null)}
                >
                  Detach from template
                </SplitButtonItem>
              </>
            ) : (
              <SplitButtonItem
                className="whitespace-nowrap"
                disabled={!canSaveTemplate}
                onClick={() => setSaveTemplateOpen(true)}
              >
                <span className="flex flex-col items-start">
                  Save as template
                  {!canSaveTemplate && (
                    <span className="text-[11px] font-normal text-muted-foreground">
                      Add a line item or note first
                    </span>
                  )}
                </span>
              </SplitButtonItem>
            )}
            <SplitButtonItem
              className="whitespace-nowrap"
              onClick={() => setManageTemplatesOpen(true)}
            >
              Manage templates
            </SplitButtonItem>
          </SplitButton>
        </header>

        {/* Preview column at 46rem, the same as create-invoice, so the two
            invoice editors share one layout. */}
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_46rem]">
          <div className="min-h-0 overflow-y-auto">
            <div className="mx-auto max-w-250 space-y-5 px-6 py-6 lg:px-10">
              {/* Captioned chips, the way the invoice editor opens: the two
                  fields that identify the document, before anything about what
                  is on it. */}
              <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                <ChipField label="Invoice number" required fieldId="invoice-number">
                  {/* With several clients the backend suffixes the number per
                      link, so the input shows that suffix after the number
                      rather than a sentence under it: it previews the result,
                      and keeps this field the same height as Due date beside
                      it, so the row stays aligned. */}
                  <InputGroup className="w-56">
                    <InputGroupInput
                      id="invoice-no"
                      placeholder="Enter invoice number"
                      // Browser autofill has nothing useful to offer for a
                      // per-invoice number, and its tint fills the field.
                      autoComplete="off"
                      aria-invalid={!!errors.invoiceNo}
                      // The group draws the error border; without this the
                      // input adds its own error ring inside it (flux's
                      // InputGroupInput clears the input's border and focus
                      // ring, but not its aria-invalid ring).
                      className="aria-invalid:ring-0"
                      aria-describedby={isBatch ? "invoice-no-suffix" : undefined}
                      value={values.invoiceNo}
                      onChange={(e) => patch({ invoiceNo: e.target.value })}
                    />
                    {isBatch ? (
                      <InputGroupAddon align="inline-end">
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                            <InputGroupText
                              id="invoice-no-suffix"
                              className="cursor-help whitespace-nowrap text-[12px] text-muted-foreground"
                            >
                              -1, -2, …
                            </InputGroupText>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-56">
                            Each client gets their own link, numbered with -1, -2, … added to this
                            invoice number.
                          </TooltipContent>
                        </Tooltip>
                      </InputGroupAddon>
                    ) : null}
                  </InputGroup>
                  {errors.invoiceNo ? <FieldError>{errors.invoiceNo}</FieldError> : null}
                </ChipField>

                <ChipField label="Due date" required fieldId="due-date">
                  <DatePicker
                    value={values.dueDate}
                    onChange={(next: string) => patch({ dueDate: next })}
                    placeholder="Select Due Date"
                    // Upstream disables every date before today.
                    min={todayKey}
                  />
                  <FieldError>{errors.dueDate}</FieldError>
                </ChipField>
              </div>

              <TemplatePicker
                templates={templateStore.templates}
                isReady={templateStore.isReady}
                isApplying={templateStore.isApplying}
                activeTemplateId={activeTemplateId}
                onChoose={chooseTemplate}
                onDetach={() => setActiveTemplateId(null)}
                onManage={() => setManageTemplatesOpen(true)}
                canSave={canSaveTemplate}
                onSave={() => setSaveTemplateOpen(true)}
              />

              {/* ── Customer ──────────────────────────────────────────────── */}
              <div data-field="recipients">
                {usesClientPicker ? (
                  <RecipientsSection
                    mid={mid}
                    recipients={recipients}
                    onChange={updateRecipients}
                    error={recipientsError}
                    requiredAddresses={requiredAddresses}
                  />
                ) : (
                  <EditorSection icon="user" title="Who you're billing">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="customer-name">Full name</FieldLabel>
                        <Input
                          id="customer-name"
                          placeholder="Eg. John Doe"
                          aria-invalid={!!errors.fullName}
                          value={values.fullName}
                          onChange={(e) => patch({ fullName: e.target.value })}
                        />
                        <FieldError>{errors.fullName}</FieldError>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="customer-email">Email ID</FieldLabel>
                        <Input
                          id="customer-email"
                          type="email"
                          placeholder="Eg. john.doe@example.com"
                          aria-invalid={!!errors.emailId}
                          value={values.emailId}
                          onChange={(e) => patch({ emailId: e.target.value })}
                        />
                        <FieldError>{errors.emailId}</FieldError>
                      </Field>

                      <Field className="sm:col-span-2">
                        <FieldLabel htmlFor="customer-phone">Phone</FieldLabel>
                        <div className="flex gap-2">
                          <Input
                            aria-label="Calling code"
                            className="w-24"
                            value={values.callingCode}
                            onChange={(e) => patch({ callingCode: e.target.value })}
                          />
                          <Input
                            id="customer-phone"
                            placeholder="Eg. 9876543211"
                            aria-invalid={!!errors.phoneNumber}
                            value={values.phoneNumber}
                            onChange={(e) => patch({ phoneNumber: e.target.value })}
                          />
                        </div>
                        <FieldError>{errors.phoneNumber}</FieldError>
                      </Field>
                    </div>
                  </EditorSection>
                )}
              </div>

              {/* ── Items, currency, discount, totals ─────────────────────── */}
              <div data-field="line-items">
                <LineItemsSection
                  mid={mid}
                  items={items}
                  errors={itemErrors}
                  itemsError={errors.items}
                  currencies={currencies}
                  currency={values.txnCurrency}
                  currencySymbol={currencySymbol}
                  discount={values.discount}
                  discountType={values.discountType}
                  discountError={errors.discount}
                  onCurrencyChange={(next) => patch({ txnCurrency: next })}
                  onDiscountChange={(next) => patch({ discount: next })}
                  onDiscountTypeChange={(next) => patch({ discountType: next })}
                  onChange={setItemsOverride}
                />
              </div>

              {/* ── Addresses — every field optional, so it opens shut ────── */}
              {/* Only for the typed customer. A picked client brings its own
                  billing and shipping address from the client book. */}
              {usesClientPicker ? null : (
                <div data-field="address">
                  <EditorSection
                    icon="map-pin"
                    title="Billing and shipping"
                    subtitle={
                      requiredAddresses.billing || requiredAddresses.shipping
                        ? "Required for this account"
                        : addressFilled
                          ? `${addressFilled} field(s) filled in`
                          : "Optional on an invoice link"
                    }
                    collapsible
                    defaultOpen={false}
                    // Required by the merchant's config: held open, as gcc forces
                    // those sections open.
                    forceOpen={
                      hasAddressError || requiredAddresses.billing || requiredAddresses.shipping
                    }
                  >
                    <div className="space-y-4">
                      <AddressFields
                        idPrefix="billing"
                        values={values.billing}
                        errors={{
                          streetAddress: errors["billing.streetAddress"],
                          landmark: errors["billing.landmark"],
                          city: errors["billing.city"],
                          zipcode: errors["billing.zipcode"],
                        }}
                        onChange={(next) => patch({ billing: { ...values.billing, ...next } })}
                      />

                      <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
                        <span className="text-[13px] text-foreground">
                          Repeat for shipping address?
                        </span>
                        <Switch
                          checked={values.shippingSameAsBilling}
                          onCheckedChange={(next) => patch({ shippingSameAsBilling: next })}
                        />
                      </div>

                      {!values.shippingSameAsBilling ? (
                        <div className="border-t border-border pt-4">
                          <p className="mb-3 text-[13px] font-medium text-foreground">
                            Shipping address
                          </p>
                          <AddressFields
                            idPrefix="shipping"
                            values={values.shipping}
                            errors={{
                              streetAddress: errors["shipping.streetAddress"],
                              landmark: errors["shipping.landmark"],
                              city: errors["shipping.city"],
                              zipcode: errors["shipping.zipcode"],
                            }}
                            onChange={(next) =>
                              patch({ shipping: { ...values.shipping, ...next } })
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                  </EditorSection>
                </div>
              )}

              {/* ── Notes ─────────────────────────────────────────────────── */}
              <EditorSection
                icon="file-text"
                title="Notes and memo"
                subtitle={notesFilled ? `${notesFilled} of 2 filled in` : "Shown on the invoice"}
                collapsible
                defaultOpen={false}
              >
                <div className="space-y-4">
                  <Field>
                    <FieldLabel htmlFor="invoice-note">Merchant&apos;s note</FieldLabel>
                    <Textarea
                      id="invoice-note"
                      rows={3}
                      placeholder="Enter a note"
                      value={values.merchantNote}
                      onChange={(e) => patch({ merchantNote: e.target.value })}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="invoice-memo">Memo</FieldLabel>
                    <Input
                      id="invoice-memo"
                      placeholder="Enter Memo"
                      value={values.memo}
                      onChange={(e) => patch({ memo: e.target.value })}
                    />
                  </Field>
                </div>
              </EditorSection>
            </div>
          </div>

          {/* Preview fills the right column on the same brand backdrop as
              create-invoice's preview column. */}
          <div
            className="brand-backdrop min-h-0 overflow-y-auto bg-cover bg-top bg-no-repeat"
            // A wash layered under the image (not `opacity` on this div)
            // lightens the image itself without touching the foreground
            // content's own opacity.
            style={brandBackdropStyle(55, INVOICE_PREVIEW_BACKDROP)}
          >
            <div className="space-y-4 p-4 md:p-6">
              <p className="text-[13px] font-medium text-muted-foreground">
                Customer preview
                {isBatch && previewRecipient
                  ? ` · ${previewRecipient.fullName}, and ${recipients.length - 1} more with the same invoice`
                  : ""}
              </p>
              <InvoicePreview
                values={previewValues}
                items={items}
                merchantName={merchantName}
                currencySymbol={currencySymbol}
                todayLabel={todayLabel}
                logoUrl={logoUrl}
                isLogoUploading={isLogoUploading}
                onLogoSelected={uploadLogo}
              />
            </div>
          </div>
        </div>
      </div>

      <BatchResultsDialog
        open={batch !== null}
        results={batch?.results ?? []}
        recipients={batch?.recipients ?? []}
        // Closing just closes: the merchant stays in the editor, e.g. to fix a
        // client whose link failed and try again. "View all Invoice Links"
        // inside the dialog is the deliberate way to the list.
        onOpenChange={(next) => {
          if (!next) setBatch(null);
        }}
      />

      <ApplyTemplateConfirm
        template={confirmTemplate}
        onCancel={() => setConfirmTemplate(null)}
        onConfirm={applyChosenTemplate}
      />

      <SaveTemplateDialog
        open={saveTemplateOpen}
        onOpenChange={setSaveTemplateOpen}
        itemCount={items.length}
        currency={values.txnCurrency}
        hasDueDate={!!values.dueDate}
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
        // "Edit" opens the template's content here: it is applied and linked,
        // and the split button then offers "Update ⟨name⟩".
        onEdit={(templateId) => {
          setManageTemplatesOpen(false);
          const template = templateStore.templates.find((t) => t.id === templateId);
          if (template) chooseTemplate(template);
        }}
      />

      <CreatedLinkDialog
        open={createdLink !== null}
        link={createdLink ?? ""}
        isShared={invoiceConfig.isCustomerSharing}
        // Same as the batch results: closing stays in the editor; the dialog's
        // own button is the way to the list.
        onOpenChange={(next) => {
          if (!next) setCreatedLink(null);
        }}
      />
    </MidGuard>
  );
}
