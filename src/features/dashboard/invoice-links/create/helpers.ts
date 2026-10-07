import {
  AMOUNT_PATTERN,
  ADDRESS_LINE_MAX_LENGTH,
  CITY_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  EMAIL_PATTERN,
  EXTENDED_ALNUM_PATTERN,
  EXTENDED_ALNUM_PATTERN_MESSAGE,
  INVOICE_ITEM_TEXT_PATTERN,
  INVOICE_ITEM_TEXT_PATTERN_MESSAGE,
  INVOICE_NO_MAX_LENGTH,
  INVOICE_NO_MIN_LENGTH,
  ITEM_TEXT_MAX_LENGTH,
  NAME_MAX_LENGTH,
  NUMERIC_DECIMAL_PATTERN,
  NUMERIC_PATTERN,
  PHONE_MAX_LENGTH,
  ZIPCODE_MAX_LENGTH,
} from "@/features/dashboard/invoice-links/create/constants";
import type {
  AddressValues,
  ApiInvoiceTemplate,
  DiscountType,
  InvoiceBulkCreateRequest,
  InvoiceCreateRequest,
  InvoiceCustomer,
  InvoiceFormValues,
  InvoiceLineItem,
  InvoiceLinkTemplate,
  InvoiceRecipient,
  TemplateLineItem,
  TemplateWriteBody,
  WireAddress,
} from "@/features/dashboard/invoice-links/create/types";
import type { Client } from "@/features/dashboard/client-management/types";
// The template store is shared with MCA invoices, whose editor reads a theme
// off every template. A template first saved here gets that editor's default
// rather than none, so it opens there exactly as a fresh MCA template would.
import { DEFAULT_THEME_METADATA } from "@/features/dashboard/create-invoice/constants";

// ── Totals ───────────────────────────────────────────────────────────────────
// Ported expression-for-expression from upstream helpers.ts (getAmount,
// getSubTotalAmount, getDiscountAmount, getTotalAmount). The `|| 0` on getAmount
// is load-bearing: an empty ppu/qty makes the product NaN, and upstream relies
// on that falling through to 0 rather than propagating into the subtotal.

/** Line amount, GST included: ppu × qty + (ppu × qty × tax%). */
export function getAmount(ppu: string, qty: string, tax: string): number {
  const ppuNum = Number(ppu);
  const qtyNum = Number(qty);
  const taxNum = Number(tax);
  return ppuNum * qtyNum + (ppuNum * qtyNum * taxNum) / 100 || 0;
}

/** Sum of every line's GST-inclusive amount. */
export function getSubTotalAmount(items: InvoiceLineItem[]): number {
  return items.reduce((acc, item) => acc + getAmount(item.ppu, item.qty, item.tax ?? "0"), 0);
}

export function getDiscountAmount(
  subTotalAmount: string,
  discount: string,
  discountType: DiscountType
): string {
  const discountNum = Number(discount);
  const subTotalAmountNum = Number(subTotalAmount);
  const discountAmount =
    discountType === "percentage" ? (subTotalAmountNum * discountNum) / 100 : discountNum || 0;
  return discountAmount.toFixed(2);
}

/** Subtotal less discount. */
export function getTotalAmount(
  items: InvoiceLineItem[],
  discount: string,
  discountType: DiscountType
): string {
  const subTotalAmount = getSubTotalAmount(items).toFixed(2);
  const discountAmount = getDiscountAmount(subTotalAmount, discount, discountType);
  return (Number(subTotalAmount) - Number(discountAmount)).toFixed(2) || "0.00";
}

/**
 * "DD/MM/YYYY 00:00:00", which is what the API takes. Upstream builds it with
 * `toLocaleDateString("en-GB")`; this formats the parts explicitly so the
 * result cannot drift with the browser's locale data.
 */
export function getFormattedDueDate(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()} 00:00:00`;
}

/**
 * 16-character reference, upstream's `generateUuid(16)`.
 *
 * crypto.getRandomValues, not Math.random: this runs in an event handler, but
 * the React Compiler rules ban Math.random from render paths and a predictable
 * merchant reference on a payment object is worth avoiding regardless.
 */
export function generateMerchantReference(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  // Upper-case, as gcc-ui-temp's generateUuid(16).toUpperCase().
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

// ── Request body ─────────────────────────────────────────────────────────────

/** The customer as the single-customer form holds it (edit of an issued invoice). */
export function customerFromValues(values: InvoiceFormValues): InvoiceCustomer {
  return {
    fullName: values.fullName,
    emailId: values.emailId,
    callingCode: values.callingCode,
    phoneNumber: values.phoneNumber,
    billing: values.billing,
    shipping: values.shipping,
    shippingSameAsBilling: values.shippingSameAsBilling,
  };
}

/** A picked recipient in the same shape, so both feed one builder. */
export function customerFromRecipient(recipient: InvoiceRecipient): InvoiceCustomer {
  return {
    fullName: recipient.fullName,
    emailId: recipient.emailId,
    callingCode: recipient.callingCode,
    phoneNumber: recipient.phoneNumber,
    billing: recipient.billing,
    shipping: recipient.shipping ?? emptyAddress(),
    shippingSameAsBilling: !recipient.shipping,
  };
}

/** Name → wire value for `addressCountry`. gcc-ui-temp sends the ISO2 code. */
export type CountryCodeOf = (country: string) => string;

const sameValue: CountryCodeOf = (country) => country;

/**
 * Everything in the body that is the invoice itself, shared by every client in
 * a batch. Shaped like gcc-ui-temp's getRequestBody (features/Invoice/helper.js),
 * the source of truth for invoice links:
 *
 *  - optional text goes as null when empty (`memo`, `additionalInfo`), never "":
 *    the backend length-checks it, so "" is an invalid field;
 *  - `businessName` is left out when there is none, as gcc's untouched field is;
 *  - only the discount that applies is sent: `discountPercent` for a percentage,
 *    `discountAmount` (the typed amount) for a fixed one;
 *  - no `extraChargeAmount`, which gcc never sends;
 *  - an item's `itemCode` and `gstPercentage` are left out when blank, as gcc's
 *    rows carry only the columns that were filled.
 */
function buildInvoiceRequestData(
  values: InvoiceFormValues,
  items: InvoiceLineItem[]
): InvoiceCreateRequest["invoiceRequestData"] {
  const subTotal = getSubTotalAmount(items).toFixed(2);
  const total = getTotalAmount(items, values.discount || "0", values.discountType);
  const discount = values.discount.trim();
  const hasTax = items.some((item) => Number(item.tax) > 0);
  const memo = values.memo.trim();
  const note = values.merchantNote.trim();

  return {
    merchantReferenceId: generateMerchantReference(),
    invoiceItems: items.map((item) => {
      const code = item.itemCode.trim();
      return {
        itemDescription: item.description || "",
        ...(code ? { itemCode: code } : {}),
        itemPrice: item.ppu || "0",
        quantity: item.qty || "0",
        // With `gst` on, the backend parses every row's gstPercentage as a
        // number, so a row without one is a null-pointer failure ("Cannot
        // invoke String.toCharArray() because val is null"). gcc-ui-temp never
        // hits that, because its GST column makes the rate required on every
        // row; lines here can mix taxed and untaxed, so an untaxed row sends
        // "0", as pg-dashboard always did. With no tax anywhere it is left out.
        ...(hasTax ? { gstPercentage: Number(item.tax) > 0 ? item.tax : "0" } : {}),
        amount: getAmount(item.ppu || "0", item.qty || "0", item.tax || "0").toFixed(2),
      };
    }),
    memo: memo || null,
    additionalInfo: note || null,
    totalAmount: total,
    subTotalAmount: subTotal,
    // gcc sends the same computed figure twice, under two names.
    amountDue: total,
    txnCurrency: values.txnCurrency || "INR",
    formattedDueDate: getFormattedDueDate(values.dueDate),
    invoiceId: values.invoiceNo || null,
    gst: hasTax,
    ...(discount && values.discountType === "percentage" ? { discountPercent: discount } : {}),
    ...(discount && values.discountType === "fixed" ? { discountAmount: discount } : {}),
    merchantLogo: { name: "", fileExtension: "" },
    additionalEmailId: [],
  };
}

/** A two-letter ISO code, which is the only thing `addressCountry` accepts. */
const ISO2 = /^[A-Za-z]{2}$/;

/**
 * An address in the wire vocabulary (`addressStreet1` …), with only the fields
 * that hold something, or null when none do. Billing and shipping use the same
 * keys in gcc-ui-temp; the country is sent as its ISO2 code.
 *
 * The code comes from the address itself when it carries one (a client-book
 * client), else from looking the name up. A country that still is not a code
 * is left out rather than sent as a name: every address field is optional on
 * an invoice link, and a name is rejected as an invalid field, failing the link.
 */
function toWireAddress(address: AddressValues, countryCode: CountryCodeOf): WireAddress | null {
  const resolved = address.countryIso2 || (address.country ? countryCode(address.country) : "");
  const entries: [keyof WireAddress, string][] = [
    ["addressStreet1", address.streetAddress],
    ["addressStreet2", address.landmark],
    ["addressCountry", ISO2.test(resolved) ? resolved.toUpperCase() : ""],
    ["addressState", address.state],
    ["addressCity", address.city],
    ["addressPostalCode", address.zipcode],
  ];
  const filled = entries.filter(([, value]) => !!value?.trim());
  return filled.length > 0
    ? (Object.fromEntries(filled.map(([key, value]) => [key, value.trim()])) as WireAddress)
    : null;
}

/** The three customer objects for one recipient, as gcc-ui-temp builds them. */
function buildCustomerParts(
  customer: InvoiceCustomer,
  countryCode: CountryCodeOf
): Pick<InvoiceCreateRequest, "plCustomerData" | "plBillingData" | "plShippingData"> {
  const billing = toWireAddress(customer.billing, countryCode);
  // gcc splits the name: the first word, then the rest.
  const [firstName = "", ...rest] = customer.fullName.trim().split(/\s+/);

  return {
    plCustomerData: {
      fullName: customer.fullName || null,
      emailId: customer.emailId || null,
      callingCode: customer.callingCode || null,
      phoneNumber: customer.phoneNumber || null,
      expiry: 6,
    },

    plBillingData: {
      ...(billing ?? {}),
      firstName: firstName || null,
      lastName: rest.join(" ") || null,
      callingCode: customer.callingCode || null,
      phoneNumber: customer.phoneNumber || null,
      emailId: customer.emailId || null,
    },

    // Same keys as billing. Pre-gcc this sent the raw form object
    // (`streetAddress`, `country`, … and a stray `shippingSameAsBilling` flag),
    // pg-dashboard's shape, which the endpoint rejects as invalid fields.
    plShippingData: customer.shippingSameAsBilling
      ? billing
      : toWireAddress(customer.shipping, countryCode),
  };
}

/**
 * Builds the create/edit/draft body. One builder for all three, exactly as
 * upstream has it — the three endpoints take the same shape and differ only in
 * URL and verb.
 *
 * The constants (`expiry: 6`, `siTxn: false`, the empty `merchantLogo`, …)
 * are gcc-ui-temp's, as is everything left out when empty.
 *
 * `customer` defaults to the single-customer form fields, which is the edit
 * path; create passes the one picked recipient instead.
 */
export function buildInvoiceRequest(
  values: InvoiceFormValues,
  items: InvoiceLineItem[],
  customer: InvoiceCustomer = customerFromValues(values),
  countryCode: CountryCodeOf = sameValue
): InvoiceCreateRequest {
  return {
    invoiceRequestData: buildInvoiceRequestData(values, items),
    ...buildCustomerParts(customer, countryCode),
    siTxn: false,
    collectByGlobalAltPay: false,
    merchantCustomPayload: null,
  };
}

/**
 * The multi-client body: one `invoiceRequestData`, identical for everyone, and
 * one customer triple per client. The backend fans it out into one link per
 * client and suffixes the invoice id with -1, -2, … in this array's order.
 */
export function buildBulkInvoiceRequest(
  values: InvoiceFormValues,
  items: InvoiceLineItem[],
  recipients: InvoiceRecipient[],
  countryCode: CountryCodeOf = sameValue
): InvoiceBulkCreateRequest {
  return {
    invoiceRequestData: buildInvoiceRequestData(values, items),
    clients: recipients.map((recipient) =>
      buildCustomerParts(customerFromRecipient(recipient), countryCode)
    ),
    siTxn: false,
    collectByGlobalAltPay: false,
    merchantCustomPayload: null,
  };
}

// ── Recipients ───────────────────────────────────────────────────────────────

/**
 * The six fields an address form shows, as strings. Read through this rather
 * than Object.values: an address can also carry `countryIso2`, which is
 * optional (undefined for most) and is not a field the merchant fills.
 */
export function addressFieldValues(address: AddressValues): string[] {
  return [
    address.streetAddress,
    address.landmark,
    address.country,
    address.state,
    address.city,
    address.zipcode,
  ].map((value) => value ?? "");
}

function sameAddress(a: AddressValues, b: AddressValues): boolean {
  return (Object.keys(a) as (keyof AddressValues)[]).every(
    (key) => (a[key] ?? "").trim().toLowerCase() === (b[key] ?? "").trim().toLowerCase()
  );
}

/**
 * A client-book record as an invoice recipient.
 *
 * The business name is the name on the invoice, as the MCA editor's Bill-to
 * card shows it, with the contact person as the fallback. A shipping address
 * that is blank or identical to billing collapses to "same as billing", which
 * is how the single-customer form would have sent it.
 */
export function clientToRecipient(client: Client): InvoiceRecipient {
  const billing: AddressValues = {
    streetAddress: client.addressLine ?? "",
    landmark: client.addressLine2 ?? "",
    country: client.countryName ?? "",
    countryIso2: client.countryIso2 || undefined,
    state: client.state ?? "",
    city: client.city ?? "",
    zipcode: client.zipcode ?? "",
  };
  const shipping: AddressValues = {
    streetAddress: client.shippingAddressLine ?? "",
    landmark: client.shippingAddressLine2 ?? "",
    country: client.shippingCountryName ?? "",
    countryIso2: client.shippingCountryIso2 || undefined,
    state: client.shippingState ?? "",
    city: client.shippingCity ?? "",
    zipcode: client.shippingZipcode ?? "",
  };
  const hasOwnShipping =
    addressFieldValues(shipping).some((v) => v.trim()) && !sameAddress(billing, shipping);

  return {
    key: client.id,
    clientId: client.id,
    fullName: client.businessName || client.primaryContactName,
    contactName: client.primaryContactName,
    emailId: client.email,
    callingCode: client.phoneDialCode,
    phoneNumber: client.phoneNumber,
    billing,
    shipping: hasOwnShipping ? shipping : null,
  };
}

/** One line per thing that would stop this recipient's link being created. */
export function validateRecipient(recipient: InvoiceRecipient): string[] {
  const issues = [
    validateFullName(recipient.fullName),
    validateEmail(recipient.emailId),
    validatePhone(recipient.phoneNumber),
    ...Object.values(validateAddress(recipient.billing)),
    ...(recipient.shipping ? Object.values(validateAddress(recipient.shipping)) : []),
  ];
  return issues.filter((issue): issue is string => !!issue);
}

// ── Templates ────────────────────────────────────────────────────────────────

/** "yyyy-mm-dd" for a local date. Call from handlers, never during render. */
export function localDateKey(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dateKeyToUtc(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
}

/** Whole days from `from` to `to`, both "yyyy-mm-dd". */
function daysBetween(from: string, to: string): number {
  return Math.round((dateKeyToUtc(to) - dateKeyToUtc(from)) / DAY_MS);
}

function addDays(key: string, days: number): string {
  const date = new Date(dateKeyToUtc(key) + days * DAY_MS);
  return date.toISOString().slice(0, 10);
}

/** "3 items · USD · due in 30 days", for the picker. */
function describeTemplate(template: ApiInvoiceTemplate): string {
  const count = template.lineItems?.length ?? 0;
  const parts = [`${count} item${count === 1 ? "" : "s"}`];
  if (template.currency) parts.push(template.currency);
  if (template.dueTermDays != null) {
    parts.push(template.dueTermDays === 0 ? "due today" : `due in ${template.dueTermDays} days`);
  }
  return parts.join(" · ");
}

export function fromApiTemplate(template: ApiInvoiceTemplate): InvoiceLinkTemplate {
  return {
    id: template.templateId,
    name: template.name,
    description: describeTemplate(template),
    savedAt: template.savedAt,
    lastUsedAt: template.lastUsedAt,
    raw: template,
  };
}

/** Number → the string the grid holds; absent stays empty rather than "0". */
const numberToField = (value: number | null | undefined): string =>
  value == null || Number.isNaN(Number(value)) ? "" : String(value);

/**
 * A (hydrated) template, as the editor's patch.
 *
 * Carries the reusable parts only: line items, currency, discount, memo and
 * note, and the due date resolved from the template's term against today.
 * Never the customer or the invoice number. Line items keep their `skuId`, so
 * saving the invoice back as a template keeps them live.
 *
 * HSN/SAC lands in the item code column, since that is the only code an
 * invoice-link line has.
 */
export function applyTemplate(
  template: ApiInvoiceTemplate,
  todayKey: string
): { patch: Partial<InvoiceFormValues>; items: InvoiceLineItem[] } {
  const items: InvoiceLineItem[] = (template.lineItems ?? []).map((line, index) => ({
    key: `tpl-${template.templateId}-${index}`,
    description: line.name || line.description || "",
    itemCode: line.hsn || line.sac || "",
    ppu: numberToField(line.unitPrice),
    qty: numberToField(line.quantity),
    tax: numberToField(line.gstRate) || "0",
    ...(line.skuId ? { skuId: line.skuId } : {}),
    ...(line.type ? { itemType: line.type } : {}),
  }));

  const discountType: DiscountType = template.discount?.type === "fixed" ? "fixed" : "percentage";

  const patch: Partial<InvoiceFormValues> = {
    discountType,
    discount: template.discount?.value ?? "",
    memo: template.memo ?? "",
    merchantNote: template.notes ?? "",
    ...(template.currency ? { txnCurrency: template.currency } : {}),
    ...(template.dueTermDays != null ? { dueDate: addDays(todayKey, template.dueTermDays) } : {}),
  };

  const emptyRow: InvoiceLineItem = {
    key: "item-0",
    description: "",
    itemCode: "",
    ppu: "",
    qty: "",
    tax: "0",
  };
  return { patch, items: items.length > 0 ? items : [emptyRow] };
}

function toTemplateLineItem(item: InvoiceLineItem): TemplateLineItem {
  const isService = item.itemType === "SERVICE";
  return {
    // With a skuId the backend re-reads name, price and code from the catalogue
    // on every GET. The values are still sent: they are what a read falls back
    // to if the SKU is ever deleted.
    ...(item.skuId ? { skuId: item.skuId } : {}),
    name: item.description,
    description: item.description,
    // The templates API reads `type` as a GOOD/SERVICE enum, so "" is a 400
    // ("monthly" template, 2026-10-07). The MCA editor never sends it empty: its
    // item dialog requires the choice. An invoice-link line only carries a
    // type when it came from the SKU catalogue, so an untyped manual line is
    // saved as a GOOD — with its code in `hsn`, exactly as before.
    type: item.itemType || "GOOD",
    quantity: Number(item.qty) || 0,
    unitPrice: Number(item.ppu) || 0,
    gstRate: Number(item.tax) || 0,
    hsn: isService ? "" : item.itemCode,
    ...(isService ? { sac: item.itemCode } : {}),
  };
}

/**
 * The editor → a template body.
 *
 * `previous` is the stored template when overwriting one. Its fields are
 * spread first and only this editor's are laid over them, so a template made
 * in the MCA editor keeps its branding, bank account, tax, LUT and recurrence
 * when it is updated from here. A brand-new template gets the same neutral
 * values the MCA editor would give one with nothing set.
 */
export function toTemplateWriteBody(
  name: string,
  values: InvoiceFormValues,
  items: InvoiceLineItem[],
  todayKey: string,
  previous?: ApiInvoiceTemplate
): TemplateWriteBody {
  const subTotal = getSubTotalAmount(items).toFixed(2);
  const dueTermDays =
    values.dueDate && daysBetween(todayKey, values.dueDate) >= 0
      ? daysBetween(todayKey, values.dueDate)
      : undefined;

  const base: TemplateWriteBody = previous
    ? { ...previous }
    : {
        name,
        bankAccountReference: null,
        isGstInvoice: false,
        themeMetadata: { ...DEFAULT_THEME_METADATA },
        tax: {},
        lut: "",
        logoEnabled: false,
        signatureEnabled: false,
      };
  // The MCA editor always sends `tax` with its derived `taxAmount`, never `{}`.
  // Invoice links have no invoice-level tax, so it is always zero; a stored
  // template's own tax fields are kept.
  base.tax = { ...((base.tax as Record<string, unknown> | undefined) ?? {}), taxAmount: "0.00" };
  // Server-managed, and the term is this editor's to set or clear.
  delete base.templateId;
  delete base.savedAt;
  delete base.lastUsedAt;
  delete base.dueTermDays;

  return {
    ...base,
    name,
    currency: values.txnCurrency,
    lineItems: items.map(toTemplateLineItem),
    discount: {
      ...(previous?.discount ?? {}),
      value: values.discount || undefined,
      type: values.discountType,
      discountAmount: getDiscountAmount(subTotal, values.discount || "0", values.discountType),
    },
    memo: values.memo,
    notes: values.merchantNote,
    // Omitted rather than null when there is no due date, which is how the
    // MCA editor says "no term"; 0 is a real term ("due today").
    ...(dueTermDays != null ? { dueTermDays } : {}),
  };
}

/** Whether there is anything on the invoice worth saving as a template. */
export function hasTemplatableContent(
  values: InvoiceFormValues,
  items: InvoiceLineItem[]
): boolean {
  return (
    items.some((item) => item.description.trim() || item.ppu.trim()) ||
    !!values.memo.trim() ||
    !!values.merchantNote.trim()
  );
}

// ── Field validation ─────────────────────────────────────────────────────────
// Each returns an error string or undefined, the shape @tanstack/react-form
// validators expect. Messages are upstream's, verbatim.

export function validateInvoiceNo(value: string): string | undefined {
  if (!value?.trim()) return "Enter Invoice number";
  if (value.length < INVOICE_NO_MIN_LENGTH || value.length > INVOICE_NO_MAX_LENGTH) {
    return `Invoice number must be between ${INVOICE_NO_MIN_LENGTH} and ${INVOICE_NO_MAX_LENGTH} characters`;
  }
  if (!EXTENDED_ALNUM_PATTERN.test(value)) {
    return `Invoice number ${EXTENDED_ALNUM_PATTERN_MESSAGE}`;
  }
  return undefined;
}

export function validateDueDate(value: string): string | undefined {
  if (!value) return "Select Due Date";
  return undefined;
}

export function validateFullName(value: string): string | undefined {
  if (!value?.trim()) return "Please enter the Full Name";
  if (value.length > NAME_MAX_LENGTH)
    return `Full Name must be at most ${NAME_MAX_LENGTH} characters`;
  return undefined;
}

export function validateEmail(value: string): string | undefined {
  if (!value?.trim()) return "Please enter the Email ID";
  if (!EMAIL_PATTERN.test(value)) return "Please enter a valid Email ID";
  if (value.length > EMAIL_MAX_LENGTH)
    return `Email ID must be at most ${EMAIL_MAX_LENGTH} characters`;
  return undefined;
}

export function validatePhone(value: string): string | undefined {
  if (!value?.trim()) return "Please enter the Phone Number";
  if (value.length > PHONE_MAX_LENGTH)
    return `Phone Number must be at most ${PHONE_MAX_LENGTH} characters`;
  if (!EXTENDED_ALNUM_PATTERN.test(value)) {
    return `Phone Number ${EXTENDED_ALNUM_PATTERN_MESSAGE}`;
  }
  return undefined;
}

export function validateDiscount(value: string, discountType: DiscountType): string | undefined {
  if (!value?.trim()) return undefined;
  if (discountType === "percentage") {
    if (!NUMERIC_DECIMAL_PATTERN.test(value)) return "Please enter Discount";
    const n = Number(value);
    if (n < 0 || n > 100) return "Discount must be between 0 and 100";
    return undefined;
  }
  if (!AMOUNT_PATTERN.test(value)) return "Please enter Discount";
  return undefined;
}

/** Address fields are all optional upstream; only length and charset are checked. */
export function validateAddress(
  values: AddressValues
): Partial<Record<keyof AddressValues, string>> {
  const errors: Partial<Record<keyof AddressValues, string>> = {};

  if (values.streetAddress) {
    if (values.streetAddress.length > ADDRESS_LINE_MAX_LENGTH) {
      errors.streetAddress = `Street Address must be at most ${ADDRESS_LINE_MAX_LENGTH} characters`;
    } else if (!EXTENDED_ALNUM_PATTERN.test(values.streetAddress)) {
      errors.streetAddress = `Street Address ${EXTENDED_ALNUM_PATTERN_MESSAGE}`;
    }
  }
  if (values.landmark) {
    if (values.landmark.length > ADDRESS_LINE_MAX_LENGTH) {
      errors.landmark = `Landmark must be at most ${ADDRESS_LINE_MAX_LENGTH} characters`;
    } else if (!EXTENDED_ALNUM_PATTERN.test(values.landmark)) {
      errors.landmark = `Landmark ${EXTENDED_ALNUM_PATTERN_MESSAGE}`;
    }
  }
  if (values.city && values.city.length > CITY_MAX_LENGTH) {
    errors.city = `City must be at most ${CITY_MAX_LENGTH} characters`;
  }
  if (values.zipcode && values.zipcode.length > ZIPCODE_MAX_LENGTH) {
    errors.zipcode = `Zipcode must be at most ${ZIPCODE_MAX_LENGTH} characters`;
  }

  return errors;
}

export type LineItemErrors = Partial<Record<keyof InvoiceLineItem, string>>;

/** Per-cell rules from upstream's InvoiceTable. Description, PPU and Qty are required. */
export function validateLineItem(item: InvoiceLineItem): LineItemErrors {
  const errors: LineItemErrors = {};

  if (!item.description?.trim()) {
    errors.description = "Enter a description";
  } else if (item.description.length > ITEM_TEXT_MAX_LENGTH) {
    errors.description = `Description must be at most ${ITEM_TEXT_MAX_LENGTH} characters`;
  } else if (!INVOICE_ITEM_TEXT_PATTERN.test(item.description)) {
    errors.description = `Description ${INVOICE_ITEM_TEXT_PATTERN_MESSAGE}`;
  }

  if (item.itemCode) {
    if (item.itemCode.length > ITEM_TEXT_MAX_LENGTH) {
      errors.itemCode = `Item Code must be at most ${ITEM_TEXT_MAX_LENGTH} characters`;
    } else if (!INVOICE_ITEM_TEXT_PATTERN.test(item.itemCode)) {
      errors.itemCode = `Item Code ${INVOICE_ITEM_TEXT_PATTERN_MESSAGE}`;
    }
  }

  if (!item.ppu?.trim()) {
    errors.ppu = "Enter a price";
  } else if (!AMOUNT_PATTERN.test(item.ppu)) {
    errors.ppu = "Price per unit must be a valid amount";
  }

  if (!item.qty?.trim()) {
    errors.qty = "Enter a quantity";
  } else if (!NUMERIC_PATTERN.test(item.qty)) {
    errors.qty = "Quantity must be a whole number";
  }

  if (item.tax && !NUMERIC_DECIMAL_PATTERN.test(item.tax)) {
    errors.tax = "Tax must be a number";
  }

  return errors;
}

export function emptyAddress(): AddressValues {
  return { streetAddress: "", landmark: "", country: "", state: "", city: "", zipcode: "" };
}
