import type { IconName } from "@/components/icon";

/** The four quick-action prompts shown on a fresh conversation, both in the
 *  panel and on the full page. `prompt` is what actually gets sent as the
 *  user's message when a chip is clicked — kept distinct from `label` since
 *  a couple read more naturally rephrased as a question in the transcript. */
export const ECHO_QUICK_ACTIONS: { id: string; label: string; icon: IconName; prompt: string }[] = [
  {
    id: "create-invoice",
    label: "Create invoice",
    icon: "file-text",
    prompt: "Create invoice",
  },
  {
    id: "last-transactions",
    label: "Show me last 5 transactions",
    icon: "credit-card",
    prompt: "Show me my last 5 transactions",
  },
  {
    id: "earnings-this-month",
    label: "What were my earnings for this month",
    icon: "trending-up",
    prompt: "What were my earnings for this month?",
  },
  {
    id: "last-fircs",
    label: "Show my last 5 FIRCs",
    icon: "landmark",
    prompt: "Show my last 5 FIRCs",
  },
];
