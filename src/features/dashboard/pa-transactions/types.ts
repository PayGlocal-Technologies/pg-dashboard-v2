// ── PA (Payment Aggregator — Cards / UPI / NetBanking) ──────────────────────

import type {
  DisputeEvent,
  RefundEvent,
  SettlementEvent,
} from "@/features/dashboard/pa-transactions/financial/types";

export interface PaTransaction {
  gid?: string;
  merchantId?: string;
  externalStatus?: string;
  maskedCardNumber?: string;
  txnCurrency?: string;
  totalAmount?: string;
  cardBrand?: string;
  paymentInstrument?: string;
  iso2Code?: string;
  encEmailId?: string;
  formattedCreationDateTime?: string;
  firstName?: string;
  lastName?: string;
  billToFirstName?: string;
  billToLastName?: string;
  message?: string;
  transactionFlow?: string;
  transactionMode?: string;
  /** Child financial events belonging to this transaction (see the Unified
   * Transaction ID & Financial Event Logic model). This ONE transaction's
   * `gid` is the only merchant-facing ID, a refund/dispute/settlement never
   * gets its own, it's just an entry in one of these arrays. Absent/empty
   * means no such event has happened yet, see getDisplayStatus/
   * deriveTransactionDetail for how these are read. */
  refunds?: RefundEvent[];
  disputes?: DisputeEvent[];
  settlements?: SettlementEvent[];
  /** Display/routing hint only, never part of the real API contract: set on
   * a pseudo-row built purely so a refund/dispute child event can be shown
   * as its own row in the Transactions table or a Linked Transactions list
   * (see linkedChildRecords.ts), without that child ever becoming a real,
   * independently-stored transaction. `linkedRecordId` is the child's own
   * event id (RefundEvent.id / DisputeEvent.id), `gid` on such a row stays
   * the PARENT's own gid, the relationship is never severed. */
  linkedRecordType?: "refund" | "dispute";
  linkedRecordId?: string;
}

export interface PaTransactionsResponse {
  gid?: string;
  status?: string;
  message?: string;
  timestamp?: string;
  reasonCode?: string;
  errors?: unknown;
  data?: {
    excludeHeaders?: string[];
    headers?: string[];
    data: PaTransaction[] | null;
    totalCount?: number | null;
  } | null;
}
