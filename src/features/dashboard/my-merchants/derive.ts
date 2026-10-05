import type {
  TimelineStep,
  TimelineStepState,
} from "@/features/dashboard/pa-transactions/components/PaymentTimeline";
import type {
  ActivityState,
  AttentionOwner,
  LifecycleStatus,
  MerchantActionKind,
  MerchantActivity,
  MerchantProduct,
  PartnerMerchant,
  RawOnboardingStatus,
  StageKey,
} from "@/features/dashboard/my-merchants/types";

/**
 * Every state the Merchants screens show, derived from a PartnerMerchant in
 * one place: lifecycle status (where the merchant is), attention (who has to
 * act), onboarding stages, the next action and the activity feed. Components
 * read these, never the raw fields, so the backend contract can change here
 * alone.
 */

type BadgeVariant = "success" | "info" | "warning" | "danger" | "muted";
/** StatusBadge's trailing glyphs (flux-ui's BadgeTrailIcon, not re-exported here). */
type BadgeTrailIcon = "check" | "x" | "clock";

// ── Lifecycle status ─────────────────────────────────────────────────────────

/** The existing onboarding statuses mapped onto lifecycle. "Under dependency"
 *  and "V-KYC pending" are not lifecycle stages of their own: the merchant is
 *  onboarding, and who is holding it up is the attention state. */
const LIFECYCLE_BY_RAW: Record<RawOnboardingStatus, LifecycleStatus> = {
  INVITED: "INVITED",
  UNDER_DEPENDENCY: "ONBOARDING",
  VKYC_PENDING: "ONBOARDING",
  UNDER_REVIEW: "UNDER_REVIEW",
  ACCEPTED: "LIVE",
  REJECTED: "REJECTED",
  DEACTIVATED: "DEACTIVATED",
};

export const LIFECYCLE_META: Record<
  LifecycleStatus,
  { label: string; variant: BadgeVariant; trailIcon?: BadgeTrailIcon }
> = {
  INVITED: { label: "Invited", variant: "muted" },
  ONBOARDING: { label: "Onboarding", variant: "info" },
  UNDER_REVIEW: { label: "Under review", variant: "warning", trailIcon: "clock" },
  LIVE: { label: "Live", variant: "success", trailIcon: "check" },
  REJECTED: { label: "Rejected", variant: "danger", trailIcon: "x" },
  DEACTIVATED: { label: "Deactivated", variant: "muted" },
};

export function lifecycleStatus(m: PartnerMerchant): LifecycleStatus {
  return LIFECYCLE_BY_RAW[m.status];
}

// ── Attention ────────────────────────────────────────────────────────────────

export type AttentionState = AttentionOwner | "none";

export const ATTENTION_META: Record<
  AttentionState,
  { label: string; eyebrow: string; icon: "alert-circle" | "clock" | "shield-check" | "check" }
> = {
  partner: { label: "Needs your action", eyebrow: "Partner action required", icon: "alert-circle" },
  merchant: { label: "Waiting for merchant", eyebrow: "Waiting for merchant", icon: "clock" },
  payglocal: {
    label: "Waiting for PayGlocal",
    eyebrow: "Waiting for PayGlocal",
    icon: "shield-check",
  },
  none: { label: "No action required", eyebrow: "No action required", icon: "check" },
};

export function attentionState(m: PartnerMerchant): AttentionState {
  return m.attention?.owner ?? "none";
}

/** Whether there is something the partner can do right now: their own
 *  action, or a nudge to a merchant who is holding things up. This is the
 *  "Needs attention" filter, separate from lifecycle status. */
export function needsAttention(m: PartnerMerchant): boolean {
  return !!m.attention?.action;
}

export const ACTION_LABEL: Record<MerchantActionKind, string> = {
  "send-reminder": "Send reminder",
  "complete-verification": "Complete verification",
  "resend-invite": "Resend invite",
};

/** Whole days since an ISO timestamp, against a caller-captured `nowMs`
 *  (CLAUDE.md: no Date.now() during render). */
export function daysSince(iso: string, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 86_400_000));
}

export function formatWaiting(days: number): string {
  if (days === 0) return "today";
  return `${days} day${days === 1 ? "" : "s"}`;
}

/** What the attention section says when nothing is open. */
export function noAttentionCopy(m: PartnerMerchant): { title: string; description: string } {
  switch (lifecycleStatus(m)) {
    case "LIVE":
      return {
        title: "Merchant is live",
        description:
          "Merchant is live and earning commission. Nothing needs your attention right now.",
      };
    case "REJECTED":
      return {
        title: "Application rejected",
        description: m.rejectionReason ?? "PayGlocal could not approve this merchant.",
      };
    case "DEACTIVATED":
      return {
        title: "Merchant deactivated",
        description: "This merchant can no longer accept payments. Nothing needs your attention.",
      };
    default:
      return {
        title: "Nothing needs your attention",
        description: "Nothing needs your attention right now.",
      };
  }
}

// ── Onboarding stages ────────────────────────────────────────────────────────

export const STAGE_LABEL: Record<StageKey, string> = {
  signup: "Sign up",
  business: "Business verification",
  account: "Account setup",
  verification: "Verification",
  activation: "Activation",
};

/** What a stage that has not started yet waits on. */
const PENDING_HINT: Record<StageKey, string> = {
  signup: "Starts when the merchant accepts the invite",
  business: "Starts after sign up",
  account: "Starts after business verification",
  verification: "Starts after account setup",
  activation: "Starts after verification",
};

const STAGE_STATE: Record<string, TimelineStepState> = {
  done: "complete",
  current: "current",
  blocked: "danger",
  pending: "pending",
};

/** Onboarding progress as PaymentTimeline steps, Sign up first. Each step's
 *  description says its state in words, so it never rests on dot colour. */
export function stageSteps(m: PartnerMerchant): TimelineStep[] {
  const steps = m.stages.map((stage): TimelineStep => {
    let description: string;
    if (stage.status === "done") {
      description = stage.completedAt
        ? `Completed ${formatDayMonth(stage.completedAt)}`
        : "Completed";
    } else if (stage.status === "pending") {
      description = PENDING_HINT[stage.key];
    } else {
      description = stage.note ?? (stage.status === "blocked" ? "Blocked" : "In progress");
    }
    return {
      id: stage.key,
      label: STAGE_LABEL[stage.key],
      description,
      state: STAGE_STATE[stage.status]!,
    };
  });
  // PaymentTimeline shows the last step first; reversed so it reads in order.
  return steps.reverse();
}

export function completedStageCount(m: PartnerMerchant): number {
  return m.stages.filter((s) => s.status === "done").length;
}

// ── Activity ─────────────────────────────────────────────────────────────────

export const ACTIVITY_STATE: Record<ActivityState, { label: string; step: TimelineStepState }> = {
  completed: { label: "Completed", step: "complete" },
  waiting: { label: "Waiting", step: "current" },
  action: { label: "Needs your action", step: "danger" },
  failed: { label: "Unsuccessful", step: "danger" },
};

/** Activity grouped by day, newest day first; within a day the events are
 *  oldest first, as PaymentTimeline then shows them newest first. */
export function activityByDay(m: PartnerMerchant): { day: string; events: MerchantActivity[] }[] {
  const sorted = [...m.activity].sort((a, b) => a.at.localeCompare(b.at));
  const groups = new Map<string, MerchantActivity[]>();
  for (const event of sorted) {
    const day = formatFullDate(event.at);
    groups.set(day, [...(groups.get(day) ?? []), event]);
  }
  return [...groups.entries()].reverse().map(([day, events]) => ({ day, events }));
}

// ── Formatting ───────────────────────────────────────────────────────────────

export const PRODUCT_LABEL: Record<MerchantProduct, string> = {
  PG: "Payment Gateway",
  MCA: "MCA",
};

const IST = "Asia/Kolkata";

export function formatDayMonth(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: IST }).format(
    new Date(iso)
  );
}

export function formatFullDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: IST,
  }).format(new Date(iso));
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: IST,
  })
    .format(new Date(iso))
    .toUpperCase();
}

/** "Today", "Yesterday", "3 days ago", else the date. */
export function formatRelative(iso: string, nowMs: number): string {
  const days = daysSince(iso, nowMs);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatFullDate(iso);
}
