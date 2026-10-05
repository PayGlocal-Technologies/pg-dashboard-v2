"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Button,
  DatePicker,
  Field,
  FieldError,
  FieldLabel,
  Input,
  StatusBadge,
  Switch,
  Textarea,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { MidGuard } from "@/components/common/MidGuard";
// Presentational only (ui + Icon + cn), so it is safe to borrow across
// features — the same way mca-links borrows CountryCell from mca-transactions.
import { ChipField } from "@/features/dashboard/create-invoice/components/InvoiceHeaderChips";
import { INVOICE_LINKS_FEATURE } from "@/features/dashboard/invoice-links/constants";
import { DEFAULT_CALLING_CODE } from "@/features/dashboard/invoice-links/create/constants";
import {
  buildInvoiceRequest,
  emptyAddress,
  validateAddress,
  validateDiscount,
  validateDueDate,
  validateEmail,
  validateFullName,
  validateInvoiceNo,
  validateLineItem,
  validatePhone,
  type LineItemErrors,
} from "@/features/dashboard/invoice-links/create/helpers";
import {
  useCreateInvoice,
  useEditInvoice,
  useInvoiceCurrencies,
  useInvoiceDraft,
  useInvoiceEditorMid,
  useInvoiceLogo,
  useMerchantShortName,
  useSaveInvoiceDraft,
} from "@/features/dashboard/invoice-links/create/hooks";
import { AddressFields } from "@/features/dashboard/invoice-links/create/components/AddressFields";
import { CreatedLinkDialog } from "@/features/dashboard/invoice-links/create/components/CreatedLinkDialog";
import { EditorSection } from "@/features/dashboard/invoice-links/create/components/EditorSection";
import { InvoicePreview } from "@/features/dashboard/invoice-links/create/components/InvoicePreview";
import { LineItemsGrid } from "@/features/dashboard/invoice-links/create/components/LineItemsGrid";
import type {
  AddressValues,
  DiscountType,
  InvoiceDraftResponse,
  InvoiceFormValues,
  InvoiceLineItem,
} from "@/features/dashboard/invoice-links/create/types";

function emptyItem(key: string): InvoiceLineItem {
  return { key, description: "", itemCode: "", ppu: "", qty: "", tax: "0" };
}

type DraftRequest = NonNullable<
  NonNullable<InvoiceDraftResponse["data"]["invoice-data"]>["invoiceRequest"]
>;

/** Accepts both vocabularies: billing comes back remapped, shipping raw. See helpers.ts. */
function toAddress(src: Record<string, string | null> | null | undefined): AddressValues {
  return {
    streetAddress: src?.addressStreet1 ?? src?.streetAddress ?? "",
    landmark: src?.addressStreet2 ?? src?.landmark ?? "",
    country: src?.addressCountry ?? src?.country ?? "",
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
function requestToValues(
  request: DraftRequest | undefined,
  invoiceId: string | undefined
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
    billing: toAddress(request.plBillingData),
    shipping: toAddress(shipping),
    // Upstream's rule: no stored shipping name means it mirrored billing.
    shippingSameAsBilling: !shipping?.firstName,
  };
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
  return rows.length > 0 ? rows : [emptyItem("item-0")];
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
 */
export function InvoiceLinkEditorFeature({ invoiceId }: { invoiceId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const mid = useInvoiceEditorMid();
  const currencies = useInvoiceCurrencies();
  const merchantName = useMerchantShortName(mid);
  const { displayUrl: logoUrl, upload: uploadLogo, isUploading: isLogoUploading } =
    useInvoiceLogo(mid);

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
  // Lazy initialisers, not render-time reads: the React Compiler rules ban
  // calling the clock during render.
  const [todayKey] = useState(() => new Date().toISOString().slice(0, 10));
  const [todayLabel] = useState(() =>
    new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  );

  const { data: draft } = useInvoiceDraft(mid, invoiceId);
  const { mutate: createInvoice, isPending: isCreating } = useCreateInvoice(mid);
  const { mutate: editInvoice, isPending: isEditing } = useEditInvoice(mid);
  const { mutate: saveDraft, isPending: isSavingDraft } = useSaveInvoiceDraft(mid, invoiceId);

  const isEditingIssued = !!invoiceId && status !== "DRAFT";

  const request = draft?.data?.["invoice-data"]?.invoiceRequest;
  const serverValues = useMemo(() => requestToValues(request, invoiceId), [request, invoiceId]);
  const serverItems = useMemo(() => requestToItems(request), [request]);

  const values = useMemo(() => {
    const merged = { ...serverValues, ...edits };
    // Upstream's `initialValue: currencyOptions[0].value` — derived rather than
    // written back into state once the currency list resolves.
    return { ...merged, txnCurrency: merged.txnCurrency || currencies[0]?.value || "" };
  }, [serverValues, edits, currencies]);

  // Untouched rows come from the server; the moment the merchant edits the
  // grid their copy wins outright.
  const items = itemsOverride ?? serverItems;

  // Amounts render with the currency's SYMBOL, not its code.
  const currencySymbol =
    currencies.find((c) => c.value === values.txnCurrency)?.symbol || values.txnCurrency;

  const patch = (next: Partial<InvoiceFormValues>) => setEdits((prev) => ({ ...prev, ...next }));

  function validate(): boolean {
    const next: Record<string, string> = {};

    const invoiceNo = validateInvoiceNo(values.invoiceNo);
    if (invoiceNo) next.invoiceNo = invoiceNo;
    const dueDate = validateDueDate(values.dueDate);
    if (dueDate) next.dueDate = dueDate;
    const fullName = validateFullName(values.fullName);
    if (fullName) next.fullName = fullName;
    const emailId = validateEmail(values.emailId);
    if (emailId) next.emailId = emailId;
    const phoneNumber = validatePhone(values.phoneNumber);
    if (phoneNumber) next.phoneNumber = phoneNumber;
    const discount = validateDiscount(values.discount, values.discountType);
    if (discount) next.discount = discount;

    const billingErrors = validateAddress(values.billing);
    Object.entries(billingErrors).forEach(([k, v]) => v && (next[`billing.${k}`] = v));
    if (!values.shippingSameAsBilling) {
      const shippingErrors = validateAddress(values.shipping);
      Object.entries(shippingErrors).forEach(([k, v]) => v && (next[`shipping.${k}`] = v));
    }

    const nextItemErrors: Record<string, LineItemErrors> = {};
    items.forEach((item) => {
      const rowErrors = validateLineItem(item);
      if (Object.keys(rowErrors).length > 0) nextItemErrors[item.key] = rowErrors;
    });

    setErrors(next);
    setItemErrors(nextItemErrors);
    return Object.keys(next).length === 0 && Object.keys(nextItemErrors).length === 0;
  }

  const onSubmit = () => {
    if (!validate()) {
      toast.error("Check the highlighted fields and try again");
      return;
    }
    const body = buildInvoiceRequest(values, items);
    const handlers = {
      onSuccess: (res: { data?: { paymentLink?: string } }) =>
        setCreatedLink(res?.data?.paymentLink ?? ""),
      onError: (error: Error) => toast.error(error?.message || "Failed to create link"),
    };
    if (isEditingIssued) editInvoice(body, handlers);
    else createInvoice(body, handlers);
  };

  // Upstream does not validate before saving a draft — a draft is by definition
  // incomplete — so neither does this.
  const onSaveDraft = () => {
    saveDraft(buildInvoiceRequest(values, items), {
      onSuccess: () => {
        toast.success("Draft saved");
        router.push("/invoice-links");
      },
      onError: (error: Error) => toast.error(error?.message || "Failed to save draft"),
    });
  };

  const isBusy = isCreating || isEditing;

  // Counts for the collapsed sections' subtitles, so shut sections still say
  // what is inside them.
  const addressFilled = [
    ...Object.values(values.billing),
    ...(values.shippingSameAsBilling ? [] : Object.values(values.shipping)),
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

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSavingDraft || isBusy}
            onClick={onSaveDraft}
          >
            {isSavingDraft ? "Saving…" : "Save as Draft"}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={isBusy}
            onClick={onSubmit}
          >
            {isBusy ? "Working…" : invoiceId ? "Update invoice link" : "Create invoice link"}
          </Button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_46rem]">
          <div className="min-h-0 overflow-y-auto">
            <div className="mx-auto max-w-250 space-y-5 px-6 py-6 lg:px-10">
              {/* Captioned chips, the way the invoice editor opens: the two
                  fields that identify the document, before anything about what
                  is on it. */}
              <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                <ChipField label="Invoice number" required fieldId="invoice-number">
                  <Input
                    id="invoice-no"
                    placeholder="Enter invoice number"
                    aria-invalid={!!errors.invoiceNo}
                    value={values.invoiceNo}
                    onChange={(e) => patch({ invoiceNo: e.target.value })}
                    className="h-9 w-56 text-[13px] shadow-none"
                  />
                  <FieldError>{errors.invoiceNo}</FieldError>
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

              {/* ── Customer ──────────────────────────────────────────────── */}
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

              {/* ── Items, currency, discount, totals ─────────────────────── */}
              <LineItemsGrid
                items={items}
                errors={itemErrors}
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

              {/* ── Addresses — every field optional, so it opens shut ────── */}
              <EditorSection
                icon="map-pin"
                title="Billing and shipping"
                subtitle={
                  addressFilled ? `${addressFilled} field(s) filled in` : "Optional on an invoice link"
                }
                collapsible
                defaultOpen={false}
                forceOpen={hasAddressError}
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
                        onChange={(next) => patch({ shipping: { ...values.shipping, ...next } })}
                      />
                    </div>
                  ) : null}
                </div>
              </EditorSection>

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

          {/* Preview fills the right column, as it does in invoice management. */}
          <div className="min-h-0 overflow-y-auto bg-muted/30">
            <div className="space-y-4 p-4 md:p-6">
              <p className="text-[13px] font-medium text-muted-foreground">Customer preview</p>
              <InvoicePreview
                values={values}
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

      <CreatedLinkDialog
        open={createdLink !== null}
        link={createdLink ?? ""}
        onOpenChange={(next) => {
          if (!next) {
            setCreatedLink(null);
            router.push("/invoice-links");
          }
        }}
      />
    </MidGuard>
  );
}
