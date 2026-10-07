/**
 * Invoice Links create/edit types.
 *
 * Ported from pg-dashboard/src/features/create-mca-payment-invoice/
 * (`types.ts`, `helpers.ts`), `page="INVOICE"` branch only.
 */

/** One row of the line-items grid, as the form holds it. All strings — the API takes strings. */
export interface InvoiceLineItem {
  key: string;
  description: string;
  itemCode: string;
  /** Price per unit. */
  ppu: string;
  qty: string;
  /** GST percentage. */
  tax: string;
  /**
   * Set when the row came from a template line that references the SKU
   * catalogue. Saving it back as a template keeps the reference, so the price
   * and name stay live. Editing the description, item code or price detaches
   * the row (see LineItemsGrid), because the merchant has then overridden what
   * the catalogue says.
   */
  skuId?: string;
  /** The SKU's GOOD / SERVICE type, which decides whether the code is HSN or SAC. */
  itemType?: string;
}

export type DiscountType = "percentage" | "fixed";

/** An address block, in the form's own field vocabulary. */
export interface AddressValues {
  streetAddress: string;
  landmark: string;
  country: string;
  state: string;
  city: string;
  zipcode: string;
}

/** The whole editor's scalar state. Line items are held separately, as upstream does. */
export interface InvoiceFormValues {
  txnCurrency: string;
  invoiceNo: string;
  /** ISO yyyy-mm-dd from the date control; converted to DD/MM/YYYY on submit. */
  dueDate: string;
  discountType: DiscountType;
  discount: string;
  merchantNote: string;
  memo: string;
  fullName: string;
  emailId: string;
  callingCode: string;
  phoneNumber: string;
  billing: AddressValues;
  shipping: AddressValues;
  shippingSameAsBilling: boolean;
}

/**
 * One person or business an invoice link is issued to.
 *
 * Either a client from the client book, or (on a draft) the customer the draft
 * was saved with, which has no client id because drafts predate the picker.
 * Everything the request needs is copied in at pick time, so a recipient does
 * not depend on the client search still holding the record.
 */
export interface InvoiceRecipient {
  /** The client id, or "draft" for the customer a draft was saved with. */
  key: string;
  clientId: string | null;
  /** Goes out as plCustomerData.fullName. */
  fullName: string;
  /** The contact person, shown under the name when it differs. */
  contactName: string;
  emailId: string;
  callingCode: string;
  phoneNumber: string;
  billing: AddressValues;
  /** Null when shipping is the billing address. */
  shipping: AddressValues | null;
}

/** The customer half of a request, before it is split into its three wire objects. */
export interface InvoiceCustomer {
  fullName: string;
  emailId: string;
  callingCode: string;
  phoneNumber: string;
  billing: AddressValues;
  shipping: AddressValues;
  shippingSameAsBilling: boolean;
}

// ── Request ──────────────────────────────────────────────────────────────────

export interface InvoiceItemPayload {
  itemDescription: string;
  itemCode: string | null;
  itemPrice: string;
  quantity: string;
  gstPercentage: string;
  amount: string;
}

export interface InvoiceCreateRequest {
  invoiceRequestData: {
    merchantReferenceId: string;
    invoiceItems: InvoiceItemPayload[];
    memo: string;
    additionalInfo: string;
    totalAmount: string | null;
    subTotalAmount: string;
    amountDue: string | null;
    txnCurrency: string;
    formattedDueDate: string | null;
    invoiceId: string | null;
    gst: boolean;
    businessName: string;
    discountPercent: string | null;
    discountAmount: string;
    extraChargeAmount: string;
    merchantLogo: { name: string; fileExtension: string };
    additionalEmailId: string[];
  };
  plCustomerData: {
    fullName: string | null;
    emailId: string | null;
    callingCode: string | null;
    phoneNumber: string | null;
    expiry: number;
  };
  plBillingData: {
    addressStreet1: string;
    addressStreet2: string;
    addressCountry: string;
    addressState: string;
    addressCity: string;
    addressPostalCode: string;
    firstName: string;
    lastName: string;
    callingCode: string | null;
    phoneNumber: string;
    emailId: string;
  };
  /**
   * NOTE: upstream sends this as the RAW form object — `streetAddress`,
   * `landmark`, `country`… plus a stray `shippingSameAsBilling` boolean — while
   * plBillingData above is remapped to `addressStreet1`/… That asymmetry is a
   * source defect, carried verbatim on purpose so this sends byte-identical
   * bodies to production. See helpers.ts buildInvoiceRequest.
   */
  plShippingData: Record<string, unknown> | null;
  siTxn: boolean;
  collectByGlobalAltPay: boolean;
  merchantCustomPayload: null;
}

export interface InvoiceCreateResponse {
  data: {
    paymentLink?: string;
    plId?: string;
    invoiceId?: string;
  };
}

type InvoiceCustomerParts = Pick<
  InvoiceCreateRequest,
  "plCustomerData" | "plBillingData" | "plShippingData"
>;

/**
 * The multi-client create. Same URL as the single create; the top-level
 * customer objects are dropped because the backend ignores them once
 * `clients` is non-empty. `invoiceRequestData.invoiceId` is the BASE id: the
 * backend appends -1, -2, … per client.
 */
export type InvoiceBulkCreateRequest = Omit<InvoiceCreateRequest, keyof InvoiceCustomerParts> & {
  clients: InvoiceCustomerParts[];
};

/** One client's outcome. A batch is partial-failure tolerant, so read every entry. */
export interface InvoiceBulkResult {
  invoiceId: string;
  success: boolean;
  /** Present on success: the single create's own response data. */
  data?: InvoiceCreateResponse["data"];
  /** Present on failure. */
  errorMessage?: string;
}

export interface InvoiceBulkCreateResponse {
  message?: string;
  data: { results: InvoiceBulkResult[] };
}

// ── Templates ────────────────────────────────────────────────────────────────
// The MCA invoice template store, read and written from here as well. Typed
// independently of create-invoice's own template types on purpose: those map
// to the MCA editor's form, while this editor owns a smaller set of fields and
// has to round-trip everything else untouched (see toTemplateWriteBody).

/**
 * A template line item. With `skuId`, the descriptive fields are optional on
 * write and come back hydrated from the live SKU on every read; without it,
 * the line is fully manual and stored as sent.
 */
export interface TemplateLineItem {
  skuId?: string | null;
  name?: string | null;
  description?: string | null;
  /** GOOD or SERVICE. */
  type?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  costPrice?: number | null;
  currency?: string | null;
  gstRate?: number | null;
  /** Set for a GOOD. */
  hsn?: string | null;
  /** Set for a SERVICE. */
  sac?: string | null;
  discount?: number | null;
  otherCharges?: number | null;
  totalPrice?: number | null;
}

/**
 * The body POSTed to /templates and PUT to /templates/{id}.
 *
 * The index signature is deliberate: a template saved from the MCA editor
 * carries branding, a receiving account, LUT, recurrence and invoice-level tax,
 * none of which this editor has. They must survive a PUT from here, so the
 * stored object is spread and only this editor's fields are laid over it.
 */
export interface TemplateWriteBody {
  name: string;
  currency?: string;
  lineItems?: TemplateLineItem[];
  discount?: {
    discountName?: string;
    value?: string;
    type?: string;
    discountAmount?: string;
  };
  memo?: string;
  notes?: string;
  /** Whole days from the issue date. */
  dueTermDays?: number;
  isGstInvoice?: boolean;
  [field: string]: unknown;
}

export type ApiInvoiceTemplate = TemplateWriteBody & {
  templateId: string;
  /** Epoch millis as a string. */
  savedAt: string;
  /** Epoch millis as a string; null until the template has been read once. */
  lastUsedAt: string | null;
};

export interface TemplateListResponse {
  data: { templates: ApiInvoiceTemplate[] };
}

export interface TemplateResponse {
  data: { template: ApiInvoiceTemplate };
}

export interface TemplateWriteResponse {
  data: { templateId: string };
}

/** A template as the picker and the manage dialog show it. */
export interface InvoiceLinkTemplate {
  id: string;
  name: string;
  /** e.g. "3 items · USD · due in 30 days". Derived, the API has no such field. */
  description: string;
  savedAt: string;
  lastUsedAt: string | null;
  /** The stored object, kept whole so a rename or update can round-trip it. */
  raw: ApiInvoiceTemplate;
}

// ── Draft read (edit prefill) ────────────────────────────────────────────────

export interface InvoiceDraftResponse {
  data: {
    "invoice-data"?: {
      invoiceRequest?: {
        invoiceRequestData?: {
          invoiceId?: string | null;
          invoiceItems?: InvoiceItemPayload[];
          memo?: string | null;
          additionalInfo?: string | null;
          txnCurrency?: string | null;
          formattedDueDate?: string | null;
          discountPercent?: string | null;
          discountAmount?: string | null;
        };
        plCustomerData?: {
          fullName?: string | null;
          emailId?: string | null;
          phoneNumber?: string | null;
          callingCode?: string | null;
        };
        plBillingData?: Record<string, string | null> | null;
        plShippingData?: Record<string, string | null> | null;
      };
    };
  };
}

// ── Static data ──────────────────────────────────────────────────────────────

export interface CurrencyMapResponse {
  data: {
    currencyMap: Record<string, { currencySymbol?: string; currenyName?: string }>;
  };
}

export interface CountryCurrencyMapResponse {
  data: {
    countryCurrencyMap: {
      countryName: string;
      iso2CountryCode: string;
      currencyCode: string;
    }[];
  };
}

export interface CountryStatesResponse {
  data: {
    countryCodeModel: { statesList: string[] };
  };
}

/**
 * Leg 1 of the logo upload. `gid` is on the ENVELOPE, alongside `data` — not
 * inside it — and is required as a header on the S3 PUT that follows.
 */
export interface InvoiceLogoResponse {
  gid?: string;
  data: {
    logo?: Record<string, string>;
  };
}

export interface MerchantAdditionalInfoResponse {
  data: {
    merchantLogoPublicUrl?: string | null;
  };
}
