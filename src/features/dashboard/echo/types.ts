/**
 * BACKEND GAP: Echo has no real AI backend yet — no NL understanding, no
 * live data. `mockPipeline.ts` resolves a fixed set of prompts to canned
 * results, and every type here describes that mock's shape, not a server
 * contract.
 */

export type AgentStepStatus = "pending" | "active" | "done";

export interface AgentStep {
  id: string;
  label: string;
  status: AgentStepStatus;
}

/** A single KPI figure — "What were my earnings this month". */
export interface EchoMetricResult {
  kind: "metric";
  title: string;
  value: string;
  changeLabel: string;
  /** `true` = green/up styling, `false` = red/down. */
  positive: boolean;
}

/** A short table — "last 5 transactions", "last 5 FIRCs". */
export interface EchoTableResult {
  kind: "table";
  title: string;
  columns: { key: string; label: string; align?: "left" | "right" }[];
  rows: Record<string, string>[];
  /** Where "View all" on this card should send the merchant. */
  viewAllHref: string;
  viewAllLabel: string;
}

/** A donut/pie breakdown, e.g. payment-mode distribution alongside a table. */
export interface EchoDonutResult {
  kind: "donut";
  title: string;
  subtitle?: string;
  segments: { key: string; label: string; value: number; color: string }[];
}

/** A call-to-action card — "Create invoice" hands off to the real workflow
 *  rather than pretending to create one inline. */
export interface EchoActionResult {
  kind: "action";
  title: string;
  description: string;
  actionLabel: string;
  href: string;
}

export type EchoResult = EchoMetricResult | EchoTableResult | EchoDonutResult | EchoActionResult;

export interface EchoMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** Only ever set on an assistant message that is still resolving. */
  steps?: AgentStep[];
  /** One reply can carry several cards (e.g. a table and a donut together),
   *  same as the reference dashboard replies. */
  results?: EchoResult[];
  /** A short line shown after the main reply, before the follow-up chips. */
  closingLine?: string;
  /** Up to 3 short follow-up prompts a merchant can tap instead of typing. */
  followUps?: string[];
  /** True once this message is fully resolved — gates the action row
   *  (copy/regenerate) and follow-up chips, which shouldn't show mid-stream. */
  complete?: boolean;
}
