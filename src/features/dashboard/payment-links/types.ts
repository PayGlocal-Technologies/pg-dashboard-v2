export type PaymentLinkStatus = "ACTIVE" | "PAID" | "EXPIRED" | "DEACTIVATED";

export interface PaymentLinkRow {
  id: string;
  amount: number;
  currency: string;
  status: PaymentLinkStatus;
  customerName: string;
  /** Customer's email address. */
  customerDetails: string;
  customerPhone: string;
  billingAddress: string;
  paymentLinkUrl: string;
  paymentFor: string;
  /** ISO date string */
  createdAt: string;
  /** ISO date string */
  expiresAt: string;
  notifyVia: string[];
}

export interface SparklinePoint {
  x: string;
  y: number;
}
