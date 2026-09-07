import type { AgentStep, EchoResult } from "@/features/dashboard/echo/types";

/**
 * BACKEND GAP: Echo has no real backend — no NL understanding, no live
 * data. This resolves the four quick-action prompts (and close variants of
 * their wording) to fixed, realistic-looking results so the panel and full
 * page have something genuine to demonstrate. Swap this for a real request
 * to an Echo endpoint once one exists; every consumer goes through
 * `runEchoPipeline`, so nothing else should need to change.
 */

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface EchoPipelineResult {
  reply: string;
  results: EchoResult[];
  closingLine: string;
  followUps: string[];
}

function matchResult(text: string): EchoPipelineResult {
  const t = text.toLowerCase();

  if (/invoice/.test(t)) {
    return {
      reply: "I can open the invoice workflow for you — fill in the client and line items there.",
      results: [
        {
          kind: "action",
          title: "Ready when you are",
          description:
            "Opens a blank invoice in the usual editor. Nothing is created until you save it.",
          actionLabel: "Create invoice",
          href: "/create-invoice",
        },
      ],
      closingLine: "Want to go deeper? Pick a suggestion below or ask your own follow-up.",
      followUps: ["Save this as a template?", "Set up a recurring invoice", "Show my draft invoices"],
    };
  }

  if (/transaction/.test(t)) {
    return {
      reply: "Here are your 5 most recent transactions, and how they split by payment mode.",
      results: [
        {
          kind: "table",
          title: "Last 5 transactions",
          columns: [
            { key: "amount", label: "Amount", align: "right" },
            { key: "status", label: "Status" },
            { key: "customer", label: "Customer" },
            { key: "method", label: "Method" },
            { key: "date", label: "Date" },
          ],
          rows: [
            { amount: "₹24,850.00", status: "Sent for capture", customer: "Sarah Mitchell", method: "Mastercard", date: "4 Sep" },
            { amount: "₹9,200.00", status: "In progress", customer: "Yajat Gupta", method: "Visa", date: "4 Sep" },
            { amount: "$1,200.00", status: "Sent for capture", customer: "James O'Brien", method: "Visa", date: "3 Sep" },
            { amount: "₹58,000.00", status: "Refunded", customer: "Priya Patel", method: "Netbanking", date: "2 Sep" },
            { amount: "€430.00", status: "Failed", customer: "Emma Thompson", method: "Visa", date: "2 Sep" },
          ],
          viewAllHref: "/pa-transactions",
          viewAllLabel: "View all transactions",
        },
        {
          kind: "donut",
          title: "Payment mode distribution",
          subtitle: "All transactions",
          segments: [
            { key: "upi", label: "UPI", value: 44, color: "var(--chart-1)" },
            { key: "card", label: "Card", value: 33, color: "var(--chart-2)" },
            { key: "netbanking", label: "Net Banking", value: 16, color: "var(--chart-3)" },
            { key: "wallet", label: "Wallet", value: 7, color: "var(--chart-4)" },
          ],
        },
      ],
      closingLine: "Want to go deeper? Pick a suggestion below or ask your own follow-up.",
      followUps: ["Only failed transactions?", "Group by payment method", "Compare to last week"],
    };
  }

  if (/earning|revenue|this month/.test(t)) {
    return {
      reply: "Here's where this month stands so far.",
      results: [
        {
          kind: "metric",
          title: "Earnings this month",
          value: "₹8,47,250.00",
          changeLabel: "+8.4% vs last month",
          positive: true,
        },
      ],
      closingLine: "Want to go deeper? Pick a suggestion below or ask your own follow-up.",
      followUps: ["Break this down by product", "Compare to last quarter", "What drove the increase?"],
    };
  }

  if (/firc/.test(t)) {
    return {
      reply: "Here are your 5 most recent FIRCs.",
      results: [
        {
          kind: "table",
          title: "Last 5 FIRCs",
          columns: [
            { key: "firc", label: "FIRC no." },
            { key: "amount", label: "Amount", align: "right" },
            { key: "currency", label: "Currency" },
            { key: "date", label: "Date" },
            { key: "status", label: "Status" },
          ],
          rows: [
            { firc: "FIRC-88213", amount: "12,400.00", currency: "USD", date: "3 Sep", status: "Issued" },
            { firc: "FIRC-88190", amount: "6,850.00", currency: "EUR", date: "1 Sep", status: "Issued" },
            { firc: "FIRC-88144", amount: "21,000.00", currency: "GBP", date: "29 Aug", status: "Issued" },
            { firc: "FIRC-88102", amount: "9,320.00", currency: "USD", date: "26 Aug", status: "Issued" },
            { firc: "FIRC-88061", amount: "3,600.00", currency: "AUD", date: "22 Aug", status: "Pending" },
          ],
          viewAllHref: "/ebrc",
          viewAllLabel: "View all FIRCs",
        },
      ],
      closingLine: "Want to go deeper? Pick a suggestion below or ask your own follow-up.",
      followUps: ["Only pending FIRCs?", "Group by currency", "How do I download one?"],
    };
  }

  return {
    reply:
      "I can help with creating invoices, your recent transactions, this month's earnings, or your last FIRCs — try one of the suggestions below.",
    results: [],
    closingLine: "",
    followUps: ["Create invoice", "Show me my last 5 transactions", "What were my earnings for this month?"],
  };
}

function makeSteps(): AgentStep[] {
  return [
    { id: "understand", label: "Understanding your request", status: "pending" },
    { id: "lookup", label: "Looking into your account", status: "pending" },
    { id: "prepare", label: "Preparing the answer", status: "pending" },
  ];
}

/**
 * Runs the mock pipeline for one user message: steps through `makeSteps()`
 * one at a time, calling `onSteps` with a fresh array after every status
 * change (never mutating the previous one, so a caller diffing by reference
 * — e.g. React state — always sees the update), then resolves the reply.
 */
export async function runEchoPipeline(
  text: string,
  onSteps: (steps: AgentStep[]) => void
): Promise<EchoPipelineResult> {
  const steps = makeSteps();
  onSteps([...steps]);

  for (let i = 0; i < steps.length; i++) {
    steps[i] = { ...steps[i]!, status: "active" };
    onSteps([...steps]);
    await delay(380 + Math.random() * 260);
    steps[i] = { ...steps[i]!, status: "done" };
    onSteps([...steps]);
  }

  return matchResult(text);
}
