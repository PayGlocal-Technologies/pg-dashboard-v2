import type { PaTransaction } from "@/features/dashboard/pa-transactions/types";

// TODO(integration): dev-only fallback. paTxnSearchApi is the real endpoint
// (see PaTransactionTable), this array only renders when that call comes
// back with zero rows (e.g. a dev/test MID with no seeded transactions), so
// the table isn't just a blank "No transactions yet" state while building
// against it. Delete this file once every environment has real data to
// query. Every card number below is masked (last 4 digits only); no real
// PAN, email or phone data is used.
//
// Unified Transaction ID & Financial Event Logic: a refund/dispute/
// settlement is NEVER its own row here, it's an entry in the relevant
// transaction's own refunds[]/disputes[]/settlements[] array (see
// PaTransaction's own doc comment). getDisplayStatus/getDisplayStatusBucket
// (paColumns.tsx) derive what the table actually shows from these arrays,
// externalStatus alone is only the underlying payment's own status.
//
// ONE ROW PER STATUS — deliberately, not a handful of "realistic customer
// journey" rows that happen to touch a few statuses each. An earlier version
// of this file told small refund/dispute stories (a partial refund here, a
// settle-then-dispute there) and left several of the 14 status-vocabulary
// chips (status/transactionStatus.ts) with no example row at all, so the
// "All" tab only ever showed 2-3 distinct chips no matter how many rows it
// had. Every TransactionStatusKey gets exactly one row below, in the same
// order the status-vocabulary spec lists them (six "before the money
// arrives", then eight "after"), so the mock set is a direct, checkable
// index of the full vocabulary rather than an emergent side effect of a few
// narrative examples.

export const MOCK_PA_TRANSACTIONS: PaTransaction[] = [
  // ── Before the money arrives ────────────────────────────────────────────

  // PROCESSING — sent to the bank, no answer yet.
  {
    gid: "gl_o-status01processing",
    merchantId: "MID-SWIG-GEN-003",
    externalStatus: "PROCESSING",
    maskedCardNumber: "XXXXXXXXXXXX1001",
    txnCurrency: "INR",
    totalAmount: "2450.00",
    cardBrand: "VISA",
    paymentInstrument: "CARDS",
    encEmailId: "arjun.mehta@example.com",
    formattedCreationDateTime: "16/09/2026, 09:12:41",
    firstName: "Arjun",
    lastName: "Mehta",
  },

  // AUTHORISED — approved by the bank, money not yet collected.
  {
    gid: "gl_o-status02authorised",
    merchantId: "MID-SWIG-GEN-003",
    externalStatus: "AUTHORIZED",
    maskedCardNumber: "XXXXXXXXXXXX1002",
    txnCurrency: "INR",
    totalAmount: "7480.00",
    cardBrand: "MASTERCARD",
    paymentInstrument: "CARDS",
    encEmailId: "tanvi.desai@example.com",
    formattedCreationDateTime: "16/09/2026, 10:05:12",
    firstName: "Tanvi",
    lastName: "Desai",
  },

  // SENT_FOR_CAPTURE — capture requested, not confirmed.
  {
    gid: "gl_o-status03sentforcapture",
    merchantId: "MID-SWIG-GEN-003",
    externalStatus: "SENT_FOR_CAPTURE",
    txnCurrency: "INR",
    totalAmount: "3233.00",
    paymentInstrument: "UPI",
    encEmailId: "priya.nair@example.com",
    formattedCreationDateTime: "16/09/2026, 08:47:05",
    firstName: "Priya",
    lastName: "Nair",
  },

  // FAILED — did not go through.
  {
    gid: "gl_o-status04failed",
    merchantId: "MID-SWIG-GEN-003",
    externalStatus: "ISSUER_DECLINE",
    maskedCardNumber: "XXXXXXXXXXXX1004",
    txnCurrency: "INR",
    totalAmount: "5400.00",
    cardBrand: "VISA",
    paymentInstrument: "CARDS",
    encEmailId: "sneha.kapoor@example.com",
    formattedCreationDateTime: "15/09/2026, 15:26:58",
    firstName: "Sneha",
    lastName: "Kapoor",
    message: "Card declined by issuing bank",
  },

  // CANCELLED — cancelled before collection, distinct from a decline.
  {
    gid: "gl_o-status05cancelled",
    merchantId: "MID-SWIG-GEN-003",
    externalStatus: "CUSTOMER_CANCELLED",
    txnCurrency: "INR",
    totalAmount: "1999.00",
    paymentInstrument: "UPI",
    encEmailId: "kabir.malhotra@example.com",
    formattedCreationDateTime: "15/09/2026, 17:22:03",
    firstName: "Kabir",
    lastName: "Malhotra",
    message: "Cancelled by customer before payment completed",
  },

  // EXPIRED — authorised, never collected in time.
  {
    gid: "gl_o-status06expired",
    merchantId: "MID-SWIG-GEN-003",
    externalStatus: "EXPIRED",
    maskedCardNumber: "XXXXXXXXXXXX1006",
    txnCurrency: "INR",
    totalAmount: "6250.00",
    cardBrand: "MASTERCARD",
    paymentInstrument: "CARDS",
    encEmailId: "simran.kaur@example.com",
    formattedCreationDateTime: "14/09/2026, 19:48:27",
    firstName: "Simran",
    lastName: "Kaur",
  },

  // ── After the money arrives ─────────────────────────────────────────────

  // SUCCESS — collected and untouched since.
  {
    gid: "gl_o-status07success",
    merchantId: "MID-SWIG-GEN-003",
    externalStatus: "SUCCESS",
    maskedCardNumber: "XXXXXXXXXXXX1007",
    txnCurrency: "INR",
    totalAmount: "14330.00",
    cardBrand: "MASTERCARD",
    paymentInstrument: "CARDS",
    encEmailId: "rohit.sharma@example.com",
    formattedCreationDateTime: "16/09/2026, 09:12:41",
    firstName: "Rohit",
    lastName: "Sharma",
    settlements: [
      {
        id: "gl_o-status07success-settlement-1",
        transactionId: "gl_o-status07success",
        amount: 14330,
        currency: "INR",
        status: "SETTLED",
        settledOnDate: "17/09/2026, 09:12:41",
        utrNumber: "UTR140330",
        settledToAccount: "HDFC ****4521",
        settlementReportId: "stl_a1b2c3d4",
      },
    ],
  },

  // REFUND_IN_PROGRESS — a refund is on the way to the customer.
  {
    gid: "gl_o-status08refundinprogress",
    merchantId: "MID-SWIG-GEN-003",
    externalStatus: "SUCCESS",
    maskedCardNumber: "XXXXXXXXXXXX1008",
    txnCurrency: "INR",
    totalAmount: "4200.00",
    cardBrand: "RUPAY",
    paymentInstrument: "CARDS",
    encEmailId: "yash.trivedi@example.com",
    formattedCreationDateTime: "14/09/2026, 12:40:18",
    firstName: "Yash",
    lastName: "Trivedi",
    refunds: [
      {
        id: "gl_o-status08refundinprogress-refund-1",
        transactionId: "gl_o-status08refundinprogress",
        amount: 4200,
        currency: "INR",
        status: "PROCESSING",
        reason: "requested by customer",
        createdAt: "15/09/2026, 09:00:00",
      },
    ],
  },

  // REFUNDED — money returned by choice, in full.
  {
    gid: "gl_o-status09refunded",
    merchantId: "MID-SWIG-GEN-003",
    externalStatus: "SUCCESS",
    txnCurrency: "INR",
    totalAmount: "5000.00",
    paymentInstrument: "UPI",
    encEmailId: "vikram.rao@example.com",
    formattedCreationDateTime: "13/09/2026, 11:58:14",
    firstName: "Vikram",
    lastName: "Rao",
    refunds: [
      {
        id: "gl_o-status09refunded-refund-1",
        transactionId: "gl_o-status09refunded",
        amount: 5000,
        currency: "INR",
        status: "COMPLETED",
        reason: "requested by customer",
        createdAt: "14/09/2026, 11:58:14",
      },
    ],
  },

  // DISPUTED — a dispute is live on this payment.
  {
    gid: "gl_o-status10disputed",
    merchantId: "MID-SWIG-GEN-003",
    externalStatus: "SUCCESS",
    maskedCardNumber: "XXXXXXXXXXXX1010",
    txnCurrency: "INR",
    totalAmount: "12500.00",
    cardBrand: "VISA",
    paymentInstrument: "CARDS",
    encEmailId: "aditi.rao@example.com",
    formattedCreationDateTime: "16/09/2026, 10:22:15",
    firstName: "Aditi",
    lastName: "Rao",
    disputes: [
      {
        id: "gl_o-status10disputed-dispute-1",
        transactionId: "gl_o-status10disputed",
        amount: 12500,
        currency: "INR",
        reason: "Fraudulent",
        reasonCode: "10.4",
        description: "The cardholder claims they did not authorise this purchase.",
        status: "NEEDS_RESPONSE",
        raisedOn: "16/09/2026, 10:22:15",
        respondBy: "22/09/2026, 10:22:15",
      },
    ],
  },

  // DISPUTE_CLEARED — dispute resolved, the money stays with the merchant.
  {
    gid: "gl_o-status11disputecleared",
    merchantId: "MID-SWIG-GEN-003",
    externalStatus: "SUCCESS",
    maskedCardNumber: "XXXXXXXXXXXX1011",
    txnCurrency: "USD",
    totalAmount: "340.00",
    cardBrand: "MASTERCARD",
    paymentInstrument: "CARDS",
    encEmailId: "marcus.lee@example.com",
    formattedCreationDateTime: "10/09/2026, 09:47:33",
    firstName: "Marcus",
    lastName: "Lee",
    disputes: [
      {
        id: "gl_o-status11disputecleared-dispute-1",
        transactionId: "gl_o-status11disputecleared",
        amount: 340,
        currency: "USD",
        reason: "Duplicate processing",
        reasonCode: "12.6",
        description: "The cardholder was charged more than once for the same purchase.",
        status: "CLEARED",
        raisedOn: "11/09/2026, 09:47:33",
        respondBy: "17/09/2026, 09:47:33",
        resolvedOn: "16/09/2026, 09:47:33",
      },
    ],
  },

  // CHARGED_BACK — dispute resolved, the money went to the customer.
  {
    gid: "gl_o-status12chargedback",
    merchantId: "MID-SWIG-GEN-003",
    externalStatus: "SUCCESS",
    maskedCardNumber: "XXXXXXXXXXXX1012",
    txnCurrency: "EUR",
    totalAmount: "212.50",
    cardBrand: "AMEX",
    paymentInstrument: "CARDS",
    encEmailId: "james.oconnor@example.com",
    formattedCreationDateTime: "09/09/2026, 22:33:41",
    firstName: "James",
    lastName: "O'Connor",
    disputes: [
      {
        id: "gl_o-status12chargedback-dispute-1",
        transactionId: "gl_o-status12chargedback",
        amount: 212.5,
        currency: "EUR",
        reason: "Credit not processed",
        reasonCode: "13.6",
        description: "The cardholder claims a refund or credit was not issued as expected.",
        status: "CHARGED_BACK",
        raisedOn: "10/09/2026, 22:33:41",
        respondBy: "16/09/2026, 22:33:41",
        resolvedOn: "15/09/2026, 22:33:41",
      },
    ],
  },

  // REFUNDED_AND_DISPUTED — money was returned AND a dispute is live.
  {
    gid: "gl_o-status13refundedanddisputed",
    merchantId: "MID-SWIG-GEN-003",
    externalStatus: "SUCCESS",
    maskedCardNumber: "XXXXXXXXXXXX1013",
    txnCurrency: "INR",
    totalAmount: "10000.00",
    cardBrand: "MASTERCARD",
    paymentInstrument: "CARDS",
    encEmailId: "farhan.ali@example.com",
    formattedCreationDateTime: "08/09/2026, 20:33:11",
    firstName: "Farhan",
    lastName: "Ali",
    refunds: [
      {
        id: "gl_o-status13refundedanddisputed-refund-1",
        transactionId: "gl_o-status13refundedanddisputed",
        amount: 2500,
        currency: "INR",
        status: "COMPLETED",
        reason: "requested by customer",
        createdAt: "10/09/2026, 09:00:00",
      },
    ],
    disputes: [
      {
        id: "gl_o-status13refundedanddisputed-dispute-1",
        transactionId: "gl_o-status13refundedanddisputed",
        amount: 2000,
        currency: "INR",
        reason: "Fraudulent",
        reasonCode: "10.4",
        description: "The cardholder claims they did not authorise this purchase.",
        // UNDER_REVIEW with documents already attached, doubling as the demo
        // for a dispute that's mid-review with evidence submitted (see
        // DisputeStatusNoticeCard's "Submitted documents" list) — an image
        // filename here gets a mock preview thumbnail (see
        // getMockDocumentPreviewUrl), a PDF still shows the plain file icon.
        status: "UNDER_REVIEW",
        raisedOn: "12/09/2026, 09:00:00",
        evidenceSubmittedOn: "14/09/2026, 11:30:00",
        documents: ["authorization-screenshot.png", "order-confirmation.pdf"],
      },
    ],
  },

  // REFUNDED_AND_CHARGED_BACK — money was returned AND a dispute was also lost.
  {
    gid: "gl_o-status14refundedandchargedback",
    merchantId: "MID-SWIG-GEN-003",
    externalStatus: "SUCCESS",
    maskedCardNumber: "XXXXXXXXXXXX1014",
    txnCurrency: "INR",
    totalAmount: "9500.00",
    cardBrand: "VISA",
    paymentInstrument: "CARDS",
    encEmailId: "om.bhatt@example.com",
    formattedCreationDateTime: "07/09/2026, 14:15:52",
    firstName: "Om",
    lastName: "Bhatt",
    refunds: [
      {
        id: "gl_o-status14refundedandchargedback-refund-1",
        transactionId: "gl_o-status14refundedandchargedback",
        amount: 3000,
        currency: "INR",
        status: "COMPLETED",
        reason: "product not received",
        createdAt: "09/09/2026, 09:00:00",
      },
    ],
    disputes: [
      {
        id: "gl_o-status14refundedandchargedback-dispute-1",
        transactionId: "gl_o-status14refundedandchargedback",
        amount: 6500,
        currency: "INR",
        reason: "Fraudulent",
        reasonCode: "10.4",
        description: "The cardholder claims they did not authorise this purchase.",
        status: "CHARGED_BACK",
        raisedOn: "11/09/2026, 09:00:00",
        respondBy: "17/09/2026, 09:00:00",
        resolvedOn: "17/09/2026, 09:00:00",
      },
    ],
  },
];
