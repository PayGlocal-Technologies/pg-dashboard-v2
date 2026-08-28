"use client";

import { HelpDrawer, type HelpGlossaryRow, type HelpGuideItem } from "@/components/common/HelpDrawer";
import type { TutorialVideo } from "@/features/dashboard/multi-currency/components/TutorialVideoTile";
import { getStatusMeta } from "@/features/dashboard/mca-transactions/columns";

/** Verbatim per the Transactions help spec. Do not reword. */
const GUIDE_ITEMS: HelpGuideItem[] = [
  {
    question: "What puts funds on hold, and how do I release them?",
    answer:
      "Usually missing invoices, purpose-code mismatches, or a routine compliance check. Most holds clear once the linked action item is resolved.",
  },
  {
    question: 'How is "Saved vs banks" calculated?',
    answer:
      "We compare our applied FX rate against the average bank rate for the same currency pair and settlement date, then multiply by your settled volume.",
  },
];

// No Transactions-specific tutorial recorded yet; TutorialTile renders its
// muted placeholder treatment ("Tutorial coming soon") whenever videoId is
// left unset, same as the Accounts drawer used before its first video shipped.
const TUTORIAL_VIDEOS: TutorialVideo[] = [{ title: "Tutorial coming soon" }];

// One row per status chip the transactions table actually renders (see
// columns.tsx's MCA_STATUS_META), read through getStatusMeta so the label,
// colour and icon here can never drift from the real table's chip. The two
// reversal statuses collapse to the same "Funds reversed" chip in the table,
// so only one representative key is listed here to match what a merchant
// actually sees. The `meaning` column is the one piece getStatusMeta doesn't
// carry, authored per the Transactions help spec.
const GLOSSARY_STATUS_KEYS: { raw: string; meaning: string }[] = [
  {
    raw: "FUNDS_ON_HOLD",
    meaning:
      "Payment received but temporarily held back, usually pending a missing invoice, a purpose-code check, or a routine compliance review.",
  },
  {
    raw: "DOCUMENT_PENDING",
    meaning: "We need an invoice from you before this payment can move forward to settlement.",
  },
  {
    raw: "SENT_FOR_REVIEW",
    meaning: "Payment is being reviewed before it's queued for settlement.",
  },
  {
    raw: "SENT_FOR_SETTLEMENT",
    meaning: "Payment has been queued and will settle to your account shortly.",
  },
  {
    raw: "SETTLED",
    meaning: "Funds have been credited to your settlement account.",
  },
  {
    raw: "FIRC_SETTLED",
    meaning: "Funds are settled and your FIRC (proof of foreign remittance) is ready to download.",
  },
  {
    raw: "REVERSAL_FOR_RISK_REJECTED",
    meaning: "The payment couldn't be completed, and any funds received have been reversed.",
  },
];

const GLOSSARY_ROWS: HelpGlossaryRow[] = GLOSSARY_STATUS_KEYS.map(({ raw, meaning }) => {
  const meta = getStatusMeta(raw, false);
  return { label: meta.label, variant: meta.variant, trailIcon: meta.trailIcon, meaning };
});

/** Help drawer for the Transactions (MCA) screen: Guide + Tutorials +
 *  Glossary. See HelpDrawer for the shared shell this configures. */
export function TransactionsHelpDrawer() {
  return (
    <HelpDrawer guideItems={GUIDE_ITEMS} tutorials={TUTORIAL_VIDEOS} glossary={GLOSSARY_ROWS} />
  );
}
