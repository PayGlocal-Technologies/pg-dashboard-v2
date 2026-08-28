"use client";

import {
  HelpDrawer,
  type HelpColumnGlossaryRow,
  type HelpGuideItem,
} from "@/components/common/HelpDrawer";

/** Verbatim per the Dashboard help spec. Do not reword. */
const GUIDE_ITEMS: HelpGuideItem[] = [
  {
    question: 'What does "Amount received at mid-market rate" mean?',
    answer:
      "Mid-market rate is the real, no-markup exchange rate between currencies, used as a transparent benchmark. Your actual settled INR reflects our applied rate, which we disclose against this benchmark so you can see any difference.",
  },
  {
    question: "What's the dashed line on the Revenue chart?",
    answer:
      "That's your previous period for comparison, not a target. When the solid line sits above it, revenue is tracking ahead of last month.",
  },
  {
    question: "What does the T+1 tag on Upcoming settlement mean?",
    answer:
      "Funds collected today settle to your bank one business day later. T+1 just shows which cutoff cycle this figure belongs to.",
  },
  {
    question: 'What\'s the difference between "Remind" and "View" in Needs attention?',
    answer:
      "Remind sends the client a payment nudge on the overdue invoice immediately. View opens the invoice itself, for cases that just need a status check before the due date.",
  },
];

/** Verbatim per the Dashboard help spec. Do not reword. */
const FIELD_GLOSSARY_ROWS: HelpColumnGlossaryRow[] = [
  {
    column: "Revenue",
    meaning: "Total invoiced amount collected in the selected period, converted to INR.",
  },
  {
    column: "Client analytics",
    meaning: "Ranks clients by amount received over the last 30 days, updated daily.",
  },
  {
    column: "Needs attention",
    meaning: "Invoices that are overdue or due soon, sorted with overdue items first.",
  },
];

/** Help drawer for the Dashboard (Home) screen: Guide + Field Glossary, no
 *  Tutorials section. See HelpDrawer for the shared shell this configures. */
export function DashboardHelpDrawer() {
  return (
    <HelpDrawer
      guideItems={GUIDE_ITEMS}
      columnGlossary={FIELD_GLOSSARY_ROWS}
      columnGlossaryLabel="Field Glossary"
    />
  );
}
