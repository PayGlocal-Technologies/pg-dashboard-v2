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
  };
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
