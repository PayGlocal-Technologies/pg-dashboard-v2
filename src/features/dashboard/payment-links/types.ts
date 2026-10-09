/**
 * One row of `POST /search/payment-link`, as pg-dashboard types it
 * (mca-payment-invoice-links/types.ts `PaymentLinks`), trimmed to what this
 * screen reads.
 */
export interface PaymentLinkApiRow {
  mid: string;
  id: string;
  /** ACTIVE, AUTHORIZED, TRANSACTED, EXPIRED, DISABLED (see PAYMENT_LINK_STATUS_META). */
  status: string;
  totalAmount: string;
  txnCurrency: string;
  fullName: string | null;
  emailId: string | null;
  phoneNumber: string | null;
  callingCode?: string;
  productDescription: string | null;
  /** "DD/MM/YYYY HH:mm:ss", like every search endpoint's formatted times. */
  formattedCreationTime: string;
  formattedExpiryTime: string;
  paymentLink: string | null;
  billingAddress: string | null;
  shippingAddress: string | null;
}

/** Doubly nested, as the search endpoints send it: `data.data` + `data.totalCount`. */
export interface PaymentLinksResponse {
  data?: { data?: PaymentLinkApiRow[]; totalCount?: number } | null;
}

/** What the table and the details modal render: one API row, flattened. */
export interface PaymentLinkRow {
  id: string;
  mid: string;
  amount: number;
  currency: string;
  /** The backend's own value, unmapped. */
  status: string;
  customerName: string;
  /** Customer's email address. */
  customerDetails: string;
  /** Dial code and number, e.g. "+91 9876543210"; "" when there is none. */
  customerPhone: string;
  billingAddress: string;
  /** Without the scheme, e.g. "pay.pgcl.com/7b3d4e". */
  paymentLinkUrl: string;
  paymentFor: string;
  /** As the API sends it (or ISO for a link created this session); format with formatTransactionTimestamp. */
  createdAt: string;
  expiresAt: string;
  /** pg-dashboard's rule: an Indian (+91) number is notified by SMS too. */
  notifyVia: string[];
}
