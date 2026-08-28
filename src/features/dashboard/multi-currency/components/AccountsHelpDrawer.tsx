"use client";

import { HelpDrawer, type HelpGuideItem } from "@/components/common/HelpDrawer";
import type { TutorialVideo } from "@/features/dashboard/multi-currency/components/TutorialVideoTile";

/** Verbatim per the International Accounts help spec. Do not reword. */
const GUIDE_ITEMS: HelpGuideItem[] = [
  {
    question: "What is this USD account, exactly?",
    answer:
      "A dedicated local account for U.S. inbound payments, mapped to your business. Funds land here first, then move into your chosen settlement currency on your regular cycle.",
  },
  {
    question: "ACH or Fedwire, which should my client use?",
    answer:
      "ACH is lower-cost and takes 1–2 business days; Fedwire settles same-day for larger amounts. Share both fields; the sender's bank picks the rail based on the amount and urgency.",
  },
  {
    question: "Is it safe to share these details externally?",
    answer:
      "Yes. The Share link exposes only the fields a client needs to send a payment, and it expires automatically. Avoid pasting the full account or routing numbers into chat or email.",
  },
];

// The only tutorial recorded so far, see TutorialVideoTile.tsx for what
// happens with this id (real thumbnail, real duration off the IFrame Player
// API, and the spotlight player on click).
const TUTORIAL_VIDEOS: TutorialVideo[] = [
  {
    title: "Google Pay on PayGlocal International Checkout",
    videoId: "bj3h6IzrYus",
  },
];

/** Help drawer for the International Accounts screen: Guide + Tutorials,
 *  no Glossary. See HelpDrawer for the shared shell this configures. */
export function AccountsHelpDrawer() {
  return <HelpDrawer guideItems={GUIDE_ITEMS} tutorials={TUTORIAL_VIDEOS} />;
}
