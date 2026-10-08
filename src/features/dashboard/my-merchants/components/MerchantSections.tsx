"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  StatusBadge,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { CopyableCell } from "@/components/common/CopyableCell";
import { cn } from "@/lib/utils";
import { PaymentTimeline } from "@/features/dashboard/pa-transactions/components/PaymentTimeline";
import {
  DetailRow,
  SectionLabel,
} from "@/features/dashboard/pa-transactions/components/TransactionDetailPrimitives";
import {
  ACTION_LABEL,
  ACTIVITY_STATE,
  ATTENTION_META,
  LIFECYCLE_META,
  PRODUCT_LABEL,
  activityByDay,
  attentionState,
  completedStageCount,
  daysSince,
  formatFullDate,
  formatTime,
  formatWaiting,
  lifecycleStatus,
  noAttentionCopy,
  stageSteps,
} from "@/features/dashboard/my-merchants/derive";
import { useMerchantActions } from "@/features/dashboard/my-merchants/hooks";
import {
  portfolioMerchantByOnboardingId,
  portfolioPath,
} from "@/features/dashboard/merchant-portfolio/derive";
import type { PartnerMerchant } from "@/features/dashboard/my-merchants/types";

/**
 * The building blocks of a merchant's details, shared by the quick drawer and
 * the full page so the two can never disagree. Styled entirely with the MCA
 * dashboard's own pieces: SectionLabel headings, flat Cards, DetailRow,
 * StatusBadge and PaymentTimeline.
 */

export function LifecycleBadge({ merchant }: { merchant: PartnerMerchant }) {
  const meta = LIFECYCLE_META[lifecycleStatus(merchant)];
  return (
    <StatusBadge variant={meta.variant} label={meta.label} trailIcon={meta.trailIcon} size="sm" />
  );
}

/** Who has to act, as an icon and words (never colour alone). The merchant's
 *  wait carries its age, so a stalled merchant stands out in the list. */
export function AttentionIndicator({
  merchant,
  nowMs,
}: {
  merchant: PartnerMerchant;
  nowMs: number;
}) {
  const state = attentionState(merchant);
  if (state === "none") return <span className="text-[12px] text-muted-foreground">—</span>;
  const meta = ATTENTION_META[state];
  const days = merchant.attention ? daysSince(merchant.attention.since, nowMs) : 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-medium",
        state === "partner" ? "text-amber-700 dark:text-amber-400" : "text-foreground/80"
      )}
    >
      <Icon name={meta.icon} size={13} aria-hidden className="shrink-0" />
      {meta.label}
      {state === "merchant" && (
        <span className="text-muted-foreground">· {formatWaiting(days)}</span>
      )}
    </span>
  );
}

/** Each product's colour, the same as the partner dashboard's product split
 *  (Payment Gateway blue, MCA green). */
const PRODUCT_DOT: Record<PartnerMerchant["products"][number], string> = {
  PG: "var(--chart-1)",
  MCA: "var(--chart-4)",
};

/** Full product names, wrapping (the drawer); `compact` is the table's form:
 *  short codes on one line, each with its colour dot, the full name on
 *  hover, so a two-product row stays one line high. */
export function ProductBadges({
  merchant,
  compact = false,
}: {
  merchant: PartnerMerchant;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <span
        className="flex items-center gap-1.5"
        aria-label={merchant.products.map((p) => PRODUCT_LABEL[p]).join(", ")}
      >
        {merchant.products.map((p) => (
          <span
            key={p}
            title={PRODUCT_LABEL[p]}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-card px-1.5 py-0.5 text-[11.5px] font-medium text-foreground/85"
          >
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: PRODUCT_DOT[p] }}
            />
            {p}
          </span>
        ))}
      </span>
    );
  }
  return (
    <span className="flex flex-wrap gap-1">
      {merchant.products.map((p) => (
        <Badge key={p} variant="secondary" size="sm" className="whitespace-nowrap">
          {PRODUCT_LABEL[p]}
        </Badge>
      ))}
    </span>
  );
}

/** Who the merchant is: name, lifecycle status, contact, onboarding ID. On
 *  the page it carries Contact merchant and More. */
export function MerchantIdentity({
  merchant,
  layout,
}: {
  merchant: PartnerMerchant;
  layout: "drawer" | "page";
}) {
  const isPage = layout === "page";
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2
            className={cn(
              "font-bold tracking-tight text-foreground",
              isPage ? "text-2xl" : "text-xl"
            )}
          >
            {merchant.name}
          </h2>
          <LifecycleBadge merchant={merchant} />
        </div>
        {merchant.businessName && (
          <p className="mt-0.5 text-sm text-muted-foreground">{merchant.businessName}</p>
        )}
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-foreground/85">
          <span className="break-all">{merchant.email}</span>
          <span aria-hidden className="text-muted-foreground">
            ·
          </span>
          <span className="whitespace-nowrap">{merchant.phone}</span>
        </p>
        {isPage && (
          <p className="mt-1 text-[12px] text-muted-foreground">
            Onboarding ID · <span className="font-mono">{merchant.onboardingId}</span>
          </p>
        )}
      </div>
      {isPage && <MerchantPageActions merchant={merchant} />}
    </div>
  );
}

function copy(value: string, label: string) {
  void navigator.clipboard
    .writeText(value)
    .then(() => toast.success(`${label} copied`))
    .catch(() => undefined);
}

function MerchantPageActions({ merchant }: { merchant: PartnerMerchant }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        leftIcon={<Icon name="mail" className="h-3.5 w-3.5" />}
        onClick={() => {
          window.location.href = `mailto:${merchant.email}`;
        }}
        className="shadow-none"
      >
        Contact merchant
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="More actions"
            leftIcon={<Icon name="more-horizontal" className="h-3.5 w-3.5" />}
            className="shadow-none"
          >
            More
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => copy(merchant.onboardingId, "Onboarding ID")}>
            Copy onboarding ID
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => copy(merchant.email, "Email")}>
            Copy email
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => copy(merchant.phone, "Phone")}>
            Copy phone
          </DropdownMenuItem>
          {merchant.referral.link && (
            <DropdownMenuItem onSelect={() => copy(merchant.referral.link!, "Referral link")}>
              Copy referral link
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** What should happen now. The most prominent section when the partner can
 *  act; a quiet status line when they can't. Shows an action only when one
 *  exists. */
export function AttentionSection({
  merchant,
  nowMs,
}: {
  merchant: PartnerMerchant;
  nowMs: number;
}) {
  const runAction = useMerchantActions();
  const router = useRouter();
  const state = attentionState(merchant);
  // Live (or since deactivated): the merchant's business lives in Merchant
  // Portfolio now, so the status card points there.
  const portfolio = portfolioMerchantByOnboardingId(merchant.onboardingId);
  const attention = merchant.attention;
  const meta = ATTENTION_META[state];
  const isActionable = !!attention?.action;
  const copyText = attention
    ? { title: attention.title, description: attention.description }
    : noAttentionCopy(merchant);
  const lifecycle = lifecycleStatus(merchant);

  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>{isActionable ? "Needs your attention" : "Status"}</SectionLabel>
      <Card
        className={cn(
          "shadow-none gap-0 p-5",
          state === "partner" && "border-amber-300 dark:border-amber-700/60",
          lifecycle === "REJECTED" && "border-red-200 dark:border-red-900/60"
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide",
                state === "partner" ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"
              )}
            >
              <Icon name={meta.icon} size={12} aria-hidden />
              {state === "none" ? LIFECYCLE_META[lifecycle].label : meta.eyebrow}
            </p>
            <p className="mt-2 text-[15px] font-semibold text-foreground">{copyText.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              {copyText.description}
            </p>
            {attention && (
              <p className="mt-2 text-[12px] text-muted-foreground">
                {meta.label} · {formatWaiting(daysSince(attention.since, nowMs))}
              </p>
            )}
          </div>
          {attention?.action && (
            <Button
              type="button"
              variant={state === "partner" ? "primary" : "outline"}
              size="sm"
              onClick={() => runAction(attention.action!, merchant)}
              className="shrink-0 shadow-none"
            >
              {ACTION_LABEL[attention.action]}
            </Button>
          )}
          {!attention && portfolio && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              rightIcon={<Icon name="chevron-right" className="h-3.5 w-3.5" />}
              onClick={() => router.push(portfolioPath(portfolio.merchantId))}
              className="shrink-0 shadow-none"
            >
              View portfolio
            </Button>
          )}
        </div>
      </Card>
    </section>
  );
}

/** Where the merchant is in the journey: the five stages, not events. */
export function OnboardingSection({ merchant }: { merchant: PartnerMerchant }) {
  const done = completedStageCount(merchant);
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <SectionLabel>Onboarding</SectionLabel>
        <span className="text-[11px] font-medium text-muted-foreground">
          {done} of {merchant.stages.length} complete
        </span>
      </div>
      <Card className="shadow-none gap-0 p-5">
        <PaymentTimeline steps={stageSteps(merchant)} />
      </Card>
    </section>
  );
}

/** What actually happened, newest day first. Meaningful events only. */
export function ActivitySection({ merchant }: { merchant: PartnerMerchant }) {
  const days = activityByDay(merchant);
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>Activity</SectionLabel>
      <Card className="shadow-none gap-0 p-5">
        {days.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No activity yet.</p>
        ) : (
          <div className="flex flex-col gap-5">
            {days.map(({ day, events }) => (
              <div key={day} className="flex flex-col gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {day}
                </p>
                <PaymentTimeline
                  steps={events.map((e) => ({
                    id: e.id,
                    label: e.title,
                    state: ACTIVITY_STATE[e.state].step,
                    description: (
                      <>
                        <span>
                          {e.actor} · {ACTIVITY_STATE[e.state].label} · {formatTime(e.at)}
                        </span>
                        {e.note && (
                          <span className="mt-0.5 block text-foreground/75">{e.note}</span>
                        )}
                      </>
                    ),
                  }))}
                />
              </div>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}

export function DetailGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] font-semibold text-foreground">{title}</p>
      {children}
    </div>
  );
}

/** Everything else about the merchant, only the fields the data carries. */
export function MerchantDetailsSection({ merchant }: { merchant: PartnerMerchant }) {
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>Merchant details</SectionLabel>
      <Card className="shadow-none gap-0 p-5">
        <div className="flex flex-col gap-5">
          <DetailGroup title="Contact">
            <DetailRow label="Email" value={<span className="break-all">{merchant.email}</span>} />
            <DetailRow label="Phone" value={merchant.phone} />
          </DetailGroup>
          {(merchant.businessName || merchant.businessType) && (
            <DetailGroup title="Business">
              {merchant.businessName && (
                <DetailRow label="Business name" value={merchant.businessName} />
              )}
              {merchant.businessType && (
                <DetailRow label="Business type" value={merchant.businessType} />
              )}
            </DetailGroup>
          )}
          <DetailGroup title="Products">
            <ProductBadges merchant={merchant} />
          </DetailGroup>
          <DetailGroup title="Referral">
            <DetailRow label="Referral type" value={merchant.referral.type} />
            <DetailRow label="Referral date" value={formatFullDate(merchant.referral.date)} />
            {merchant.referral.link && (
              <DetailRow
                label="Referral link"
                value={
                  <CopyableCell
                    value={merchant.referral.link}
                    copyValue={merchant.referral.link}
                    label="Referral link"
                    className="text-[13px]"
                  />
                }
              />
            )}
          </DetailGroup>
          <DetailGroup title="Onboarding">
            <DetailRow
              label="Onboarding ID"
              value={
                <CopyableCell
                  value={merchant.onboardingId}
                  copyValue={merchant.onboardingId}
                  label="Onboarding ID"
                  monospace
                  className="text-[13px]"
                />
              }
            />
            <DetailRow
              label="Onboarding mode"
              value={merchant.assisted ? "Assisted by you" : "Self-serve"}
            />
            <DetailRow label="Created" value={formatFullDate(merchant.createdAt)} />
            <DetailRow label="Last updated" value={formatFullDate(merchant.updatedAt)} />
          </DetailGroup>
        </div>
      </Card>
    </section>
  );
}
