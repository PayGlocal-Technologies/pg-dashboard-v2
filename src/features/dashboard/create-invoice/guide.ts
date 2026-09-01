import type { GuideStep } from "@/components/common/guide/types";

/** Storage id for the create-invoice walkthrough. Bump the version suffix if
 *  the steps below change enough that returning merchants should see it.
 *
 *  v1 → v2: the tour skipped two blocks that gate the submit — the dates row
 *  and the declaration — so a merchant could follow it end to end and still be
 *  stopped at Generate. Both are steps now, and every step that blocks says so. */
export const CREATE_INVOICE_GUIDE_KEY = "create-invoice-v2";

/**
 * The editor's walkthrough, in the order the page is filled in.
 *
 * This screen replaced a six-step wizard: everything is visible at once now,
 * which is faster once you know it and harder the first time, since nothing
 * tells you where to start. A DQA pass called that out — "no guide present when
 * it's a completely new UI and workflow" — and this is the answer. `target`
 * values match the `data-guide` attributes on each section.
 *
 * Every block that can stop a Generate is a step and carries `required`, so the
 * tour and the readiness checklist beside the Generate button describe the same
 * set of things. The wizard could not omit a mandatory step; a flat page can,
 * and the due date is the one merchants were losing minutes to — it is the third
 * chip in a row that used to have no captions at all.
 *
 * Deliberately about the flow rather than the controls. A merchant who has never
 * raised an invoice here needs to know the order and what each block is for; the
 * controls themselves are labelled.
 */
export const CREATE_INVOICE_GUIDE_STEPS: GuideStep[] = [
  {
    target: "invoice-template",
    title: "Start from a template",
    description:
      "Reuse a saved invoice's items, terms and branding. Skip this to start from scratch, and save this invoice as a template when you are done.",
    side: "bottom",
    align: "start",
  },
  {
    target: "invoice-dates",
    title: "Number it and set the dates",
    description:
      "The number is generated for you and the issue date defaults to today, so the one to set is the due date — pick a term like Net 15, or a specific day. Nothing generates without it.",
    side: "bottom",
    align: "start",
    required: true,
  },
  {
    target: "invoice-client",
    title: "Choose who it bills",
    description:
      "Pick an existing client or add a new one. Their billing address prints on the invoice, so it has to be complete before you can generate.",
    side: "bottom",
    align: "start",
    required: true,
  },
  {
    target: "invoice-items",
    title: "Add what you sold",
    description:
      "Each line needs a name, type, rate and quantity. Set the invoice currency here too, and add a discount or tax below the items.",
    side: "top",
    align: "start",
    required: true,
  },
  {
    target: "invoice-payment",
    title: "Pick where you get paid",
    description:
      "Choose the receiving account to print on the invoice. Your PayGlocal accounts are suggested for the currency you picked, and you can add your own.",
    side: "top",
    align: "start",
    required: true,
  },
  {
    target: "invoice-preview",
    title: "See it as your customer will",
    description:
      "The document and the notification email update as you type. Advanced branding below sets your logo, signature, theme and colours.",
    side: "left",
    align: "start",
  },
  {
    target: "invoice-consent",
    title: "Confirm the details are right",
    description:
      "PayGlocal is the platform, not the auditor of what goes out — so you confirm the invoice is accurate before it is finalised. The tick is the last thing standing between a draft and a generated invoice.",
    side: "top",
    align: "start",
    required: true,
  },
  {
    target: "invoice-generate",
    title: "Generate when you are ready",
    description:
      "Your draft saves itself as you work. The counter beside this button lists anything still missing and jumps you to it; once it reads Ready, generating finalises the invoice, renders the PDF and lets you email it.",
    side: "bottom",
    align: "end",
  },
];
