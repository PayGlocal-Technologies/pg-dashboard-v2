"use client";

import { Badge, Button, Card, Separator, Shimmer, StatusBadge } from "@/components/ui";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { cn } from "@/lib/utils";
import type {
  ActionItem,
  ActionKind,
  OnboardingCounts,
} from "@/features/dashboard/partner-home/mock-data";

/** One CTA per kind of stall, so the button says what it will do. */
const ACTION_LABEL: Record<ActionKind, string> = {
  "send-reminder": "Send reminder",
  "complete-for-merchant": "Complete for merchant",
  "resend-invite": "Resend invite",
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

/**
 * Onboarding pipeline: the merchants the partner referred, counted by stage,
 * then the ones only the partner can move along, oldest first. One card, two
 * parts, in the MCA dashboard's Needs attention row style.
 */
export function OnboardingPipelineCard({
  onboarding,
  actionItems,
  isLoading,
  onViewAll,
  onAction,
}: {
  onboarding: OnboardingCounts;
  actionItems: ActionItem[];
  isLoading?: boolean;
  onViewAll: () => void;
  onAction: (item: ActionItem) => void;
}) {
  const signedUpShare =
    onboarding.invited > 0 ? Math.round((onboarding.signedUp / onboarding.invited) * 100) : 0;

  // Stage tone from the app's existing status colours: neutral while moving,
  // amber where the partner is needed, green once it earns.
  const stages = [
    { label: "Invited", count: onboarding.invited, hint: "Link sent", tone: "neutral" },
    {
      label: "Signed up",
      count: onboarding.signedUp,
      hint: `${signedUpShare}% of invited`,
      tone: "neutral",
    },
    {
      label: "Documents pending",
      count: onboarding.documentsPending,
      hint: "Needs your help",
      tone: onboarding.documentsPending > 0 ? "warning" : "neutral",
    },
    {
      label: "Under review",
      count: onboarding.underReview,
      hint: "With PayGlocal",
      tone: "neutral",
    },
    { label: "Live", count: onboarding.live, hint: "Earning commission", tone: "success" },
  ] as const;

  // Oldest stall first: the longest wait is the one most likely to be lost.
  const items = [...actionItems].sort((a, b) => b.waitingDays - a.waitingDays);

  return (
    <Card className="h-full gap-0 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Onboarding pipeline</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Merchants you referred, by stage. Live merchants earn you commission.
          </p>
        </div>
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={onViewAll}
          className="h-auto min-h-0 shrink-0 p-0 text-xs font-semibold"
        >
          View all merchants
        </Button>
      </div>

      <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {stages.map((stage) => (
          <li
            key={stage.label}
            className={cn(
              // Five stages in a 2-up grid leave Live alone on its row; it
              // takes the full row there instead of a half-empty one.
              "rounded-lg border px-3 py-2.5 last:col-span-2 sm:last:col-span-1",
              stage.tone === "warning" && "border-amber-500/30 bg-amber-500/10",
              stage.tone === "success" && "border-emerald-500/30 bg-emerald-500/10",
              stage.tone === "neutral" && "border-border bg-muted/40"
            )}
          >
            {isLoading ? (
              <Shimmer className="h-6 w-10" />
            ) : (
              <p
                className={cn(
                  "text-xl font-bold tabular-nums",
                  stage.tone === "warning" && "text-amber-700 dark:text-amber-400",
                  stage.tone === "success" && "text-emerald-700 dark:text-emerald-400",
                  stage.tone === "neutral" && "text-foreground"
                )}
              >
                {stage.count}
              </p>
            )}
            <p className="mt-1 text-[12.5px] font-medium text-foreground">{stage.label}</p>
            <p className="text-[11px] text-muted-foreground">{stage.hint}</p>
          </li>
        ))}
      </ol>

      <Separator className="my-4" />

      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
          Needs your action
          {items.length > 0 && (
            <Badge variant="warning" size="sm">
              {items.length}
            </Badge>
          )}
        </h3>
        {items.length > 1 && <p className="text-[11px] text-muted-foreground">Oldest first</p>}
      </div>

      {isLoading ? (
        <div className="mt-2 space-y-3">
          {[0, 1, 2].map((i) => (
            <Shimmer key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <PlaceholderState
          variant="no-data"
          size="sm"
          title="Nothing needs you right now"
          description="No merchants need your attention right now."
          className="py-4"
        />
      ) : (
        <ul className="mt-1 flex flex-col">
          {items.map((item, i) => (
            <li
              key={item.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3",
                i > 0 && "border-t border-border"
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-[11px] font-semibold text-muted-foreground"
                >
                  {initials(item.merchant)}
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                    <span className="truncate">{item.merchant}</span>
                    <Badge variant="secondary" size="sm">
                      {item.product}
                    </Badge>
                  </p>
                  <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                    {item.issue}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge
                  variant="warning"
                  label={`Waiting ${item.waitingDays} ${item.waitingDays === 1 ? "day" : "days"}`}
                  size="sm"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => onAction(item)}>
                  {ACTION_LABEL[item.action]}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
