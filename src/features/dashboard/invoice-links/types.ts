/**
 * Invoice Links wire types.
 *
 * Ported field-for-field from pg-dashboard's
 * `src/features/mca-payment-invoice-links/types.ts` (`InvoiceLinks`,
 * `InvoiceApiResponse`), which is what `page="INVOICE"` renders.
 *
 * NOT to be confused with MCA Invoices (`features/dashboard/mca-invoices`).
 * That is the PACB invoicing product on the `/gcc/v3/mca-invoice/*` tree;
 * this is the PA invoice-link product on `/gcc/v1/customer-data/invoice/*`.
 * Different rail, different MID pool, different API family.
 */

/** One row of the invoice links list. Field names are the API's, verbatim. */
export interface InvoiceLink {
  attemptedTxns: string | null;
  businessName: string | null;
  emailId: string;
  formattedActivationDate: string;
  formattedCreationTime: string;
  formattedDueDate: string;
  fullName: string | null;
  hashEmailId: string;
  hashPhoneNumber: string;
  id: string;
  memo: string | null;
  merchantReferenceId: string;
  mid: string;
  /** "true" when the invoice was settled outside the gateway. A string, not a boolean. */
  paidOffline: string | null;
  phoneNumber: string;
  plId: string;
  searchId: string;
  status: string;
  successGid: string | null;
  totalAmount: string;
  txnCurrency: string;
}

/**
 * Search response. The outer `data` is the BaseResponse envelope's; the inner
 * `data` is the row array — the same double nesting every OpenSearch-backed
 * table in pg-dashboard returns.
 */
export interface InvoiceLinksResponse {
  data: {
    headers: string[];
    data: InvoiceLink[];
    totalCount: number;
  };
}

// ── Row actions ──────────────────────────────────────────────────────────────

/** Preview response: a presigned GET for the rendered invoice PDF. */
export interface InvoicePreviewResponse {
  data: {
    presignedUrl: string;
  };
}

/** One entry of the upload manifest sent in leg 1. */
export interface DocumentPayload {
  name: string;
  fileExtension: string;
}

/**
 * Leg 1's response, and the payment-proof read: both are a flat
 * `{ [filename]: url }` map. On the way up those URLs are presigned PUTs; on
 * the way back they are presigned GETs.
 */
export interface InvoiceDocumentMapResponse {
  data: Record<string, string>;
}

/**
 * `verify-upload`'s answer. When not COMPLETED, `fileData` maps each file
 * still missing to a fresh presigned PUT, plus `metaData[filename]` holding
 * the x-amz-meta-* values that upload must carry (keys without the prefix).
 * Shape read from gcc-ui-temp's useUploadDocsToS3, which retries from it.
 */
export interface InvoiceVerifyUploadResponse {
  data?: {
    Status?: string;
    fileData?: Record<string, unknown> & {
      metaData?: Record<string, Record<string, string>>;
    };
  };
}
