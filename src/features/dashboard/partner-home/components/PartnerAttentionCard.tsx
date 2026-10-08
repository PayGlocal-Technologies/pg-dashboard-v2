"use client";

import { Badge, Button, Card, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { cn } from "@/lib/utils";
import type { ActionItem, ActionKind } from "@/features/dashboard/partner-home/mock-data";

/** One CTA per kind of stall, so the button says what it will do. */
const ACTION_LABEL: Record<ActionKind, string> = {
  "send-reminder": "Remind",
  "complete-for-merchant": "Complete",
  "resend-invite": "Resend",
};

/** How many rows fit beside the commission card; the rest are on View all. */
const PREVIEW_LIMIT = 3;

/**
 * Merchants stalled in onboarding that only the partner can move along,
 * longest wait first. The MCA dashboard's Needs attention card: a plain row
 * list, one action each, centred in whatever height the row gives it.
 */
export function PartnerAttentionCard({
  items,
  isLoading,
  onViewAll,
  onAction,
  followedUp = {},
}: {
  items: ActionItem[];
  isLoading?: boolean;
  onViewAll: () => void;
  onAction: (item: ActionItem) => void;
  /** Rows followed up this session, by item id, and how. */
  followedUp?: Record<string, "send-reminder" | "resend-invite">;
}) {
  const sorted = [...items].sort((a, b) => b.waitingDays - a.waitingDays);
  const preview = sorted.slice(0, PREVIEW_LIMIT);

  return (
    <Card className="flex h-full flex-col gap-0 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          Needs your attention
          {items.length > 0 && (
            <Badge variant="warning" size="sm">
              {items.length}
            </Badge>
          )}
        </h2>
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={onViewAll}
          className="h-auto min-h-0 p-0 text-xs font-semibold"
        >
          View all
        </Button>
      </div>

      <div className="flex flex-1 flex-col justify-center">
        {isLoading ? (
          <div className="mt-2 space-y-3">
            {Array.from({ length: PREVIEW_LIMIT }).map((_, i) => (
              <Shimmer key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : preview.length === 0 ? (
          <PlaceholderState
            variant="no-data"
            size="sm"
            title="You're all caught up"
            description="Merchants stuck in onboarding will show up here."
            className="py-4"
          />
        ) : (
          <ul className="flex flex-col">
            {preview.map((item, i) => (
              <li
                key={item.id}
                className={cn(
                  "flex items-center justify-between gap-3 py-3.5",
                  i > 0 && "border-t border-border"
                )}
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                    <span className="truncate">{item.merchant}</span>
                    <Badge variant="secondary" size="sm">
                      {item.product}
                    </Badge>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.issue}</p>
                  {followedUp[item.id] ? (
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                      <Icon name="check" size={11} aria-hidden />
                      {followedUp[item.id] === "resend-invite" ? "Invite resent" : "Reminded"} just
                      now
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                      Waiting {item.waitingDays} {item.waitingDays === 1 ? "day" : "days"}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onAction(item)}
                  disabled={!!followedUp[item.id]}
                  className="shrink-0 shadow-none"
                >
                  {followedUp[item.id]
                    ? followedUp[item.id] === "resend-invite"
                      ? "Resent"
                      : "Reminded"
                    : ACTION_LABEL[item.action]}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
