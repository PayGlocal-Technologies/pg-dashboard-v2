"use client";

import {
  HelpDrawer,
  type HelpColumnGlossaryRow,
  type HelpGuideItem,
} from "@/components/common/HelpDrawer";
import type { TutorialVideo } from "@/features/dashboard/multi-currency/components/TutorialVideoTile";

/** Verbatim per the Settlements help spec. Do not reword. */
const GUIDE_ITEMS: HelpGuideItem[] = [
  {
    question: "What is a UTR, and where do I use it?",
    answer:
      "The Unique Transaction Reference is the bank's own ID for a settlement transfer. Quote it when reconciling against your bank statement or if you need to trace a transfer with your bank.",
  },
  {
    question: "Settlement ID vs. UTR Number — which do I quote where?",
    answer:
      "Settlement ID is PayGlocal's internal reference — use it when contacting support. UTR is the bank's reference — use it when reconciling with your bank statement.",
  },
];

// No Settlements-specific tutorial recorded yet; TutorialTile renders its
// muted placeholder treatment ("Tutorial coming soon") whenever videoId is
// left unset, same as Transactions before it had one.
const TUTORIAL_VIDEOS: TutorialVideo[] = [{ title: "Tutorial coming soon" }];

/** Verbatim per the Settlements help spec. Do not reword. */
const COLUMN_GLOSSARY_ROWS: HelpColumnGlossaryRow[] = [
  {
    column: "Transactions",
    meaning: "Count of individual payments bundled into that settlement batch.",
  },
  {
    column: "UTR Number",
    meaning: "The bank-issued reference for that specific transfer. Appears once settlement is complete.",
  },
  {
    column: "Settlement ID",
    meaning: "PayGlocal's internal ID for the batch, used for support tickets and API lookups.",
  },
  {
    column: "Status",
    meaning: "Where the batch is: Processing, Settled, or Failed — hover the icon for the reason.",
  },
];

/** Help drawer for the Settlements screen: Guide + Tutorials + Table Column
 *  Glossary, no status Glossary. See HelpDrawer for the shared shell this
 *  configures. */
export function SettlementsHelpDrawer() {
  return (
    <HelpDrawer
      guideItems={GUIDE_ITEMS}
      tutorials={TUTORIAL_VIDEOS}
      columnGlossary={COLUMN_GLOSSARY_ROWS}
    />
  );
}
