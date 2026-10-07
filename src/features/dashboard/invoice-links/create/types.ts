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
  /**
   * Ticked in the item dialog: once the invoice link is created, the line is
   * imported into SKU management. Client-only — the invoice payload has no such
   * field (buildInvoiceRequest maps items field by field, so it never leaks).
   */
  saveAsSku?: boolean;
}

/**
 * Body of POST /v3/sku/{mid}/import/previous-items, the call create-invoice
 * makes for its own "Save to SKU catalogue" lines. Field-for-field the same.
 */
export interface SkuImportRequest {
  items: {
    name: string;
    type: string | null;
    hsnSac: string;
    unitPrice: string;
    currency: string | null;
    description: null;
  }[];
}

export type DiscountType = "percentage" | "fixed";

/** An address block, in the form's own field vocabulary. */
export interface AddressValues {
  streetAddress: string;
  landmark: string;
  /** The country's name, as the address form shows it. */
  country: string;
  /**
   * The country's ISO2 code when it is already known — set for a client from
   * the client book, whose record carries it. Preferred over looking the name
   * up, because the client book and this form name some countries differently.
   */
  countryIso2?: string;
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

/** One line on the wire. `itemCode` / `gstPercentage` are left out when blank, as gcc-ui-temp does. */
export interface InvoiceItemPayload {
  itemDescription: string;
  itemCode?: string;
  itemPrice: string;
  quantity: string;
  gstPercentage?: string;
  amount: string;
}

/** An address on the wire: billing and shipping share these keys. Empty fields are left out. */
export interface WireAddress {
  addressStreet1?: string;
  addressStreet2?: string;
  /** ISO2 country code, e.g. "GB". */
  addressCountry?: string;
  addressState?: string;
  addressCity?: string;
  addressPostalCode?: string;
}

export interface InvoiceCreateRequest {
  invoiceRequestData: {
    merchantReferenceId: string;
    invoiceItems: InvoiceItemPayload[];
    memo: string | null;
    additionalInfo: string | null;
    totalAmount: string | null;
    subTotalAmount: string;
    amountDue: string | null;
    txnCurrency: string;
    formattedDueDate: string | null;
    invoiceId: string | null;
    gst: boolean;
    businessName?: string;
    /** Sent only for a percentage discount. */
    discountPercent?: string;
    /** Sent only for a fixed discount: the amount typed. */
    discountAmount?: string;
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
  plBillingData: WireAddress & {
    firstName: string | null;
    lastName: string | null;
    callingCode: string | null;
    phoneNumber: string | null;
    emailId: string | null;
  };
  /** Same keys as billing (gcc-ui-temp); null when there is no shipping address. */
  plShippingData: WireAddress | null;
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
