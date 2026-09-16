// Fixed labels for the invoice document and its email preview.
//
// Headings, column headers and totals rows only. User-entered content (item
// names, memo, notes, addresses) is never touched, because rewording a
// merchant's own words would change what the invoice says.
//
// English only, deliberately. This module used to carry fifteen locales behind a
// language picker, which promised something no document could keep: the server's
// generate-invoice takes no locale, so a merchant could pick Japanese, see a
// Japanese preview, and receive an English PDF. The picker is gone and so are the
// translations — they are in git history if the renderer ever learns locales, and
// restoring them means restoring a wire field to carry the choice too.

export type InvoiceLabels = {
  invoice: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  dueBy: string;
  issuedBy: string;
  billedTo: string;
  description: string;
  qty: string;
  unitPrice: string;
  tax: string;
  discount: string;
  total: string;
  subtotal: string;
  totalExcludingTax: string;
  totalTax: string;
  amountDue: string;
  scanToPay: string;
  thankYou: string;
  invoiceFrom: string;
  invoiceTo: string;
  paymentMethod: string;
  payments: string;
  questions: string;
  bankDetails: string;
  accountHolder: string;
  accountNumber: string;
  bankName: string;
  ifscOrRouting: string;
};

export const INVOICE_LABELS: InvoiceLabels = {
  invoice: "Invoice",
  invoiceNumber: "Invoice No.",
  issueDate: "Issue date",
  dueDate: "Due date",
  dueBy: "Due by",
  issuedBy: "Issued by",
  billedTo: "Billed to",
  description: "Description",
  qty: "Qty",
  unitPrice: "Unit price",
  tax: "Tax",
  discount: "Discount",
  total: "Total",
  subtotal: "Subtotal",
  totalExcludingTax: "Total excluding tax",
  totalTax: "Total tax",
  amountDue: "Amount due",
  scanToPay: "Scan to pay",
  thankYou: "Thank you",
  invoiceFrom: "Invoice from",
  invoiceTo: "Invoice to",
  paymentMethod: "Payment method",
  payments: "Payments",
  questions: "Questions?",
  bankDetails: "Bank details",
  accountHolder: "Account holder",
  accountNumber: "Account no.",
  bankName: "Bank",
  ifscOrRouting: "IFSC / Routing",
};
