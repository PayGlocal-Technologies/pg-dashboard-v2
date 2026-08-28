"use client";

import {
  HelpDrawer,
  type HelpColumnGlossaryRow,
  type HelpGuideItem,
} from "@/components/common/HelpDrawer";

/** Verbatim per the Platforms help spec. Do not reword. */
const GUIDE_ITEMS: HelpGuideItem[] = [
  {
    question: "Why does Amazon ask for a settlement or bank statement?",
    answer:
      "Marketplaces run their own check to confirm a new payout account genuinely belongs to you before routing money to it. It's their verification step, not PayGlocal's.",
  },
  {
    question: "Why does the country selector matter?",
    answer:
      "It determines which of your virtual accounts and which set of Amazon instructions are shown, since payout setup differs by Amazon marketplace and currency.",
  },
  {
    question: "What is Account Details actually for?",
    answer:
      "It's the exact set of fields (account number, routing codes, bank name) you'll paste into Amazon's Deposit Methods page. Expand it, copy each field across, then confirm in Amazon.",
  },
];

/**
 * Verbatim per the Platforms help spec. Do not reword.
 *
 * Typed as HelpColumnGlossaryRow — the shared label/meaning row shape the
 * Dashboard and Settlements drawers already render — rather than the
 * StatusBadge-backed HelpGlossaryRow, because these rows are plain terms with
 * no chip behind them. The field is named `column` for its first caller (a
 * table's column headers); here it carries a term instead, which is exactly
 * why that row shape was kept generic.
 */
const TERM_GLOSSARY_ROWS: HelpColumnGlossaryRow[] = [
  {
    column: "Settlement Statement",
    meaning: "Amazon's own record of your payout history, generated from within Seller Central.",
  },
  {
    column: "Bank settlement statement",
    meaning:
      "A recent statement from your actual bank, showing the account matches what you're registering.",
  },
  {
    column: "Deposit Methods",
    meaning: "The page inside Amazon Seller Central where payout account details are entered.",
  },
];

/**
 * Help drawer for the Platforms screen: Guide + Term Glossary, no Tutorials
 * section — the same shape the Dashboard drawer takes, and the spec asked for
 * no video tile here.
 *
 * Content only. Positioning, the entrance/exit animation, the backdrop-free
 * drop-shadow elevation, close behaviour (X, click-outside, Escape), the
 * non-blue accordion hover and the pinned footer all come from the shared
 * HelpDrawer shell, so this screen can never drift from the other four.
 */
export function PlatformsHelpDrawer() {
  return (
    <HelpDrawer
      guideItems={GUIDE_ITEMS}
      columnGlossary={TERM_GLOSSARY_ROWS}
      columnGlossaryLabel="Term Glossary"
    />
  );
}
