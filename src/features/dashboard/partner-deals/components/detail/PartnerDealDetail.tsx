"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button, Separator, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icon";
import { CopyableText } from "@/components/common/CopyableText";
import { cn } from "@/lib/utils";
import { formatTransactionTimestamp } from "@/lib/utils/format";
import { REFERRAL_TYPES } from "@/features/dashboard/partner-deals/constants";
import { DEAL_STATUS_META } from "@/features/dashboard/partner-deals/status";
import { PartnerDealPricing } from "@/features/dashboard/partner-deals/components/detail/PartnerDealPricing";
import type { Deal } from "@/features/dashboard/partner-deals/types";

const referralTypeLabel = (value: string) =>
  REFERRAL_TYPES.find((t) => t.value === value)?.label ?? value;

/** What each status means, in one line under the name. Used deals say it
 *  through their usage details instead. */
const STATUS_COPY: Partial<Record<Deal["status"], string>> = {
  ACTIVE: "This deal is active and can be used by a referred business.",
  DEACTIVATED: "This deal has been deactivated and can no longer be used.",
};

type Fact = { label: string; value: ReactNode };

/** Drops the facts a deal doesn't have, so no empty row is ever drawn. */
const present = (facts: (Fact | null)[]): Fact[] => facts.filter((f): f is Fact => f !== null);

function MetaItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-[13px] font-medium text-foreground">{children}</dd>
    </div>
  );
}

/** Deal name, status and its meaning: the first three things anyone needs. */
function PartnerDealHeader({ deal }: { deal: Deal }) {
  const { label, variant, trailIcon } = DEAL_STATUS_META[deal.status];
  const copy = STATUS_COPY[deal.status];
  return (
    <header>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon name="file-text" size={13} aria-hidden />
        {referralTypeLabel(deal.referralType)}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
        <h1 className="min-w-0 break-words text-2xl font-bold tracking-tight text-foreground">
          {deal.name}
        </h1>
        <StatusBadge variant={variant} label={label} trailIcon={trailIcon} />
      </div>
      {copy && <p className="mt-1.5 text-[13px] text-muted-foreground">{copy}</p>}
    </header>
  );
}

/** Who used it, on which onboarding, and when. Used deals only. */
function usageItems(deal: Deal): Fact[] {
  if (deal.status !== "USED") return [];
  return present([
    deal.usedBy ? { label: "Used by", value: deal.usedBy } : null,
    deal.onboardingId ? { label: "Onboarding ID", value: deal.onboardingId } : null,
    deal.usedAt ? { label: "Used on", value: formatTransactionTimestamp(deal.usedAt) } : null,
  ]);
}

/** Created, the deactivation date when there is one, and the deal ID last:
 *  the ID is a reference, not the headline. */
function metaItems(
  deal: Deal,
  { withReferralType, withDealId }: { withReferralType: boolean; withDealId: boolean }
): Fact[] {
  return present([
    withReferralType
      ? { label: "Referral type", value: referralTypeLabel(deal.referralType) }
      : null,
    { label: "Created on", value: formatTransactionTimestamp(deal.createdAt) },
    deal.status === "DEACTIVATED" && deal.deactivatedAt
      ? { label: "Deactivated on", value: formatTransactionTimestamp(deal.deactivatedAt) }
      : null,
    withDealId
      ? {
          label: "Deal ID",
          value: (
            <CopyableText value={deal.dealId} valueClassName="font-mono text-[13px] font-medium" />
          ),
        }
      : null,
  ]);
}

/**
 * REFERRAL LINK, near the top since sharing it is the thing a partner does
 * most. The URL truncates visually (the full value is what's copied and is
 * in the title tooltip); the button confirms with "Copied" for a moment.
 * Not shown for a deactivated deal, whose link can no longer be used.
 */
function PartnerDealReferralLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link", { description: "Select it and copy it manually." });
    }
  }

  return (
    <section aria-labelledby="deal-link-heading">
      <h2
        id="deal-link-heading"
        className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
      >
        Referral link
      </h2>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <Icon name="link" size={14} className="shrink-0 text-muted-foreground" aria-hidden />
          <span title={link} className="min-w-0 truncate font-mono text-[12.5px] text-foreground">
            {link}
          </span>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => void copy()}
          aria-live="polite"
          leftIcon={<Icon name={copied ? "check" : "copy"} className="h-3.5 w-3.5" aria-hidden />}
          // Fixed width: "Copied" is shorter than the label, and the link box
          // beside it shouldn't grow and shrink with the feedback.
          className="shrink-0 sm:min-w-[10.5rem]"
        >
          {copied ? "Copied" : "Copy referral link"}
        </Button>
      </div>
    </section>
  );
}

/**
 * Everything about one deal, shared by the drawer and the full page so the
 * two can never drift: name and status, the deal's facts, the referral link,
 * and Pricing. Only the arrangement differs.
 *
 * "drawer": one column; the facts sit as a compact grid under the header.
 * "page": a card beside a Deal Information column (lg+), which takes the
 * facts instead; below lg the facts stay under the header as in the drawer.
 */
export function PartnerDealDetailContent({
  deal,
  layout,
}: {
  deal: Deal;
  layout: "drawer" | "page";
}) {
  const usage = usageItems(deal);
  const showLink = deal.status !== "DEACTIVATED";
  const isPage = layout === "page";
  // The drawer shows the deal ID in its own header (as Transaction Details
  // does), so its facts grid leaves it out rather than say it twice.

  const body = (
    <div className="min-w-0 space-y-6">
      <PartnerDealHeader deal={deal} />

      <dl
        className={cn(
          "grid grid-cols-2 gap-x-6 gap-y-3",
          !isPage ? "sm:grid-cols-2" : "sm:grid-cols-3 lg:hidden"
        )}
      >
        {[...usage, ...metaItems(deal, { withReferralType: false, withDealId: isPage })].map(
          (item) => (
            <MetaItem key={item.label} label={item.label}>
              {item.value}
            </MetaItem>
          )
        )}
      </dl>

      {showLink && (
        <>
          <Separator />
          <PartnerDealReferralLink link={deal.referralLink} />
        </>
      )}

      <Separator />
      <PartnerDealPricing pricing={deal.pricing} />
    </div>
  );

  if (!isPage) return body;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
      <div className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6">{body}</div>
      <aside
        aria-labelledby="deal-info-heading"
        className="hidden rounded-xl border border-border bg-card p-5 lg:sticky lg:top-4 lg:block"
      >
        <h2
          id="deal-info-heading"
          className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Deal information
        </h2>
        <dl className="mt-3 space-y-3">
          {[...metaItems(deal, { withReferralType: true, withDealId: true }), ...usage].map(
            (item) => (
              <MetaItem key={item.label} label={item.label}>
                {item.value}
              </MetaItem>
            )
          )}
        </dl>
      </aside>
    </div>
  );
}

/**
 * The full-page view, reached by the drawer's Expand: Back (to the list)
 * and Collapse (back into the drawer) on the left, as on Transaction Detail.
 */
export function PartnerDealDetailPage({
  deal,
  onBack,
  onCollapse,
}: {
  deal: Deal;
  onBack: () => void;
  onCollapse: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <div className="mb-3 flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={<Icon name="chevron-left" className="h-4 w-4" />}
          onClick={onBack}
          className="pl-0 text-primary hover:text-primary-hover"
        >
          Back to Partner Deals
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={<Icon name="shrink" className="h-4 w-4" />}
          onClick={onCollapse}
          className="text-muted-foreground hover:text-foreground"
        >
          Collapse
        </Button>
      </div>
      <PartnerDealDetailContent deal={deal} layout="page" />
    </div>
  );
}
