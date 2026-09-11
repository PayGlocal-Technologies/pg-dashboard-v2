/**
 * The merchant-facing slice of Freshdesk's `cf_issue` -> `cf_category` tree.
 *
 * ## Why this is a subset
 *
 * Freshdesk carries 30 issues, and a large share of them are agent bookkeeping
 * rather than anything a merchant would file: Spam, Duplicate, QC, BIN Audit,
 * Internal Communication, CYBS User Updated, Merchant Monitoring Report,
 * Legal Notice. Several more have only agent *dispositions* for categories —
 * "Suspected Fraud -> Merchant Fraud -> Termination Notice Sent", "Fraud
 * Account -> Terminated", "Denied Onboarding". Offering those in a merchant's
 * dropdown would invite a merchant to classify themselves as fraudulent, and
 * would poison the desk's reporting either way. So this list is curated, and
 * curated at the category level too: an issue can be included while the
 * dispositions under it ("Settlement Report Sent", "Invoice sent", "Raised
 * with bank") are dropped.
 *
 * ## The values are verbatim, the labels are not
 *
 * `value` is the exact string Freshdesk stores and the API validates against,
 * typos and all — "Discrepance in Settlement" and "T& C Issue" are real, and
 * correcting either would fail validation. `label` is what the merchant reads,
 * and is present only where the stored string is misspelt or too cryptic to
 * show. Never edit a `value` to match its `label`.
 *
 * ## BACKEND GAP - the third level is unreachable
 *
 * Freshdesk nests a third level under these (`cf_sub_category`, ~150 values),
 * but the create endpoint accepts only `cfIssue` and `cfCategory`. Until a
 * field exists for it, the picker stops at two levels; the sub-category is
 * left for an agent to set. Adding it here would mean sending a field the
 * backend drops.
 *
 * Every issue below is guaranteed at least one category, which is what lets
 * the form always send a matching `cfCategory`. An issue with no categories
 * (Freshdesk has several) would force the payload to fall back to the server
 * default "Escalation Matrix", which is not a valid category for it.
 */

export interface TicketCategoryOption {
  /** Verbatim Freshdesk value. */
  value: string;
  /** Only when the value itself should not be shown. */
  label?: string;
}

export interface TicketIssueOption {
  /** Verbatim Freshdesk value. */
  value: string;
  label: string;
  categories: TicketCategoryOption[];
}

export const TICKET_ISSUES: TicketIssueOption[] = [
  {
    value: "Settlement Related",
    label: "Settlements",
    categories: [
      { value: "Delay in settlement" },
      { value: "Discrepance in Settlement", label: "Discrepancy in settlement" },
      {
        value: "Merchant not receiving Settlement report",
        label: "Not receiving settlement reports",
      },
      { value: "Unable to Download Report", label: "Unable to download a report" },
      { value: "Settlement related info", label: "Settlement information request" },
      { value: "Settlement Mark up", label: "Settlement markup" },
      { value: "Report Customisation Request", label: "Report customisation request" },
      {
        value: "Request addition or removal of receipt from mailing list",
        label: "Add or remove an email from the receipt mailing list",
      },
      { value: "Entry Related", label: "A specific settlement entry" },
    ],
  },
  {
    value: "Transaction Related",
    label: "Transactions",
    categories: [
      { value: "Transaction failure" },
      { value: "Amount debited and transaction failed" },
      { value: "Transaction Mismatch", label: "Transaction mismatch" },
      { value: "Transaction not reflecting in Settlement" },
      {
        value: "Transaction not reflecting in GCC",
        label: "Transaction not reflecting on the dashboard",
      },
      { value: "Transaction on hold by bank" },
      { value: "Trace Transaction", label: "Trace a transaction" },
      { value: "Payment Link", label: "Payment link" },
      { value: "GST Related", label: "GST" },
      { value: "Email notification stopped" },
      { value: "Echo Request", label: "Echo request" },
    ],
  },
  {
    value: "Refund Related",
    label: "Refunds",
    categories: [
      { value: "Refund Failure", label: "Refund failure" },
      { value: "Refund Discrepancy", label: "Refund discrepancy" },
      { value: "Refund Clarification", label: "Refund clarification" },
      { value: "Requested ARN", label: "Request an ARN" },
      { value: "TDS Refund", label: "TDS refund" },
      { value: "Tech Related Issue", label: "Technical issue with a refund" },
    ],
  },
  {
    value: "Account Related",
    label: "Account and access",
    categories: [
      { value: "Forgot Password", label: "Forgot password" },
      { value: "Forgot User Name", label: "Forgot username" },
      { value: "Account blocked" },
      { value: "Account Disabled", label: "Account disabled" },
      { value: "Invalid TOTP", label: "Invalid authenticator code" },
      { value: "Activation Link Expired", label: "Activation link expired" },
      { value: "Admin Access Request", label: "Request admin access" },
      { value: "Read Only access", label: "Request read-only access" },
      { value: "Account creation request" },
      { value: "Email ID change request", label: "Change registered email" },
      // "Phone Number change" is the near-duplicate of this in Freshdesk;
      // only one of the two belongs in front of a merchant.
      { value: "Mobile number change request", label: "Change registered mobile number" },
      { value: "Postal address change" },
    ],
  },
  {
    value: "GCC Issue (Prod)",
    label: "Dashboard",
    categories: [
      { value: "Dashboard Access", label: "Dashboard access" },
      { value: "Dashboard Issue", label: "Something on the dashboard is broken" },
      { value: "Change Password Issue", label: "Trouble changing password" },
      { value: "Activation Link Expired", label: "Activation link expired" },
      { value: "Notification Issue", label: "Notifications" },
      { value: "Payment Link Access", label: "Payment link access" },
      { value: "Payment Button Access", label: "Payment button access" },
      { value: "T& C Issue", label: "Terms & Conditions" },
    ],
  },
  {
    value: "Merchant Request",
    label: "Requests and changes",
    categories: [
      { value: "Escalation Matrix", label: "Escalation matrix" },
      { value: "Test MID Creation", label: "Create a test MID" },
      { value: "Product feature addition", label: "Add a product feature" },
      { value: "Change bank account details" },
      { value: "Payment Gateway Request", label: "Payment gateway request" },
      { value: "Add Email Notifications", label: "Add email notifications" },
      { value: "Customisation Request", label: "Customisation request" },
      { value: "Display Name Change", label: "Change display name" },
      { value: "Logo Change Request", label: "Change logo" },
      { value: "Address Change", label: "Change address" },
      { value: "Purpose Code", label: "Purpose code" },
      { value: "Processor Addition", label: "Add a processor" },
      { value: "Enable Payment Link", label: "Enable payment links" },
      { value: "Enable Payment Button", label: "Enable payment buttons" },
      { value: "Enable MCA Account", label: "Enable an MCA account" },
      { value: "Enable Domestic", label: "Enable domestic payments" },
      { value: "Enable Amex", label: "Enable Amex" },
    ],
  },
  {
    value: "Invoice Related",
    label: "Invoices",
    categories: [
      { value: "Merchant Requested for Invoice", label: "Request an invoice" },
      { value: "Merchant Requested for revised invoice", label: "Request a revised invoice" },
      { value: "Requested for payment", label: "Payment request" },
      { value: "GST Related", label: "GST" },
    ],
  },
  {
    value: "FIRC Request",
    label: "FIRC",
    categories: [
      { value: "Requested FIRC", label: "Request a FIRC" },
      { value: "Requested changes", label: "Request changes to a FIRC" },
    ],
  },
  {
    value: "Onboarding",
    label: "Onboarding",
    categories: [
      { value: "Onboarding related", label: "General onboarding query" },
      { value: "Document related", label: "Documents" },
      { value: "VKYC", label: "Video KYC" },
      { value: "B2C Welcome email", label: "Welcome email" },
    ],
  },
  {
    value: "Dispute Transactions",
    label: "Disputes",
    categories: [{ value: "Netbanking Transactions", label: "Netbanking transaction" }],
  },
  {
    value: "Fraud Reporting",
    label: "Fraud reporting",
    categories: [
      {
        value: "Customer Raised Fraud Transaction",
        label: "A customer reported a fraudulent transaction",
      },
    ],
  },
  {
    value: "T&C Related",
    label: "Terms and fees",
    categories: [
      { value: "Fees Related", label: "Fees" },
      { value: "Merchant Education", label: "Guidance on terms" },
    ],
  },
];

export function categoriesForIssue(issue: string): TicketCategoryOption[] {
  return TICKET_ISSUES.find((i) => i.value === issue)?.categories ?? [];
}

/**
 * Display text for a stored `cf_issue`.
 *
 * Falls back to the raw value, which is the whole point: a ticket raised
 * before this list was curated, or filed by an agent under an internal issue,
 * still has to render. Showing "Spam" is correct; showing nothing is not.
 */
export function issueLabel(issue: string | null | undefined): string {
  if (!issue) return "";
  return TICKET_ISSUES.find((i) => i.value === issue)?.label ?? issue;
}

/** Display text for a stored `cf_category`. Same fallback reasoning as
 *  `issueLabel` — and the category is searched across every issue, since a
 *  ticket's issue may not be one this list carries. */
export function categoryLabel(category: string | null | undefined): string {
  if (!category) return "";
  for (const issue of TICKET_ISSUES) {
    const match = issue.categories.find((c) => c.value === category);
    if (match) return match.label ?? match.value;
  }
  return category;
}

/**
 * Proposed `cf_issue` -> `type` (Freshdesk's `ticket_type`) mapping.
 *
 * BACKEND GAP - NOT SENT, and must not be. The Merchant Support API has no
 * field for `type`; the backend stamps every ticket "GCC related issues/request".
 * Sending an unknown field risks a 400 from a strict DTO binder, so this is
 * documentation with a type-checked shape, not a payload.
 *
 * Why it matters. `type` is `required_for_agents`, and its 14 values are a
 * near-duplicate of the `cf_issue` taxonomy — Settlement & Recon, Refund
 * Related, Transaction Related, Chargeback, Merchant Request, Pre-Onboarding
 * all have direct counterparts below. Of the twelve issues a merchant can
 * raise from this dashboard, exactly one ("GCC Issue (Prod)") is typed
 * correctly today; the other eleven arrive on the desk mislabelled, which
 * misroutes any Freshdesk view, SLA policy, automation rule or report keyed
 * off `type`.
 *
 * And because the backend fills the field with a plausible-looking value, the
 * `required_for_agents` validation is already satisfied when an agent opens
 * the ticket: they see a filled field with no prompt to correct it. A blank
 * would have forced the right answer on first save.
 *
 * The fix belongs in the backend, deriving `type` from `cfIssue` with this
 * table — better than accepting `type` from a client, because it cannot drift.
 * The values below are verbatim from the ticket-fields reference; the
 * *pairings* are a proposal for support ops to confirm, not established fact.
 *
 * Four `type` values have no `cf_issue` counterpart here and are unreachable
 * either way: Integration, Spam, TID Procurment, Alert. "Transaction Failure
 * Related" is likewise unused — it is narrower than the issue level, matching
 * a category ("Transaction failure") rather than an issue.
 */
export const PROPOSED_TICKET_TYPE_BY_ISSUE: Record<string, string> = {
  "Settlement Related": "Settlement & Recon",
  "Transaction Related": "Transaction Related",
  "Refund Related": "Refund Related",
  "Account Related": "Merchant account level issues (Account Activation)",
  "GCC Issue (Prod)": "GCC related issues/request",
  "Merchant Request": "Merchant Request",
  Onboarding: "Pre-Onboarding",
  "Dispute Transactions": "Chargeback",
  "Fraud Reporting": "Goods or services issue or Merchant Reporting",
  // No dedicated `type` exists for invoices, FIRCs or T&C questions, so all
  // three fall to the general request bucket rather than being invented.
  "Invoice Related": "Merchant Request",
  "FIRC Request": "Merchant Request",
  "T&C Related": "Merchant Request",
};
