"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Separator,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { CopyableCell } from "@/components/common/CopyableCell";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { TimeRangeTabs } from "@/components/common/TimeRangeTabs";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import { formatCurrency } from "@/lib/utils";
import { formatTransactionTimestamp } from "@/lib/utils/format";
import { PaymentLinkMetricCard } from "@/features/dashboard/payment-links/components/PaymentLinkMetricCard";
import {
  DetailRow,
  SectionLabel,
} from "@/features/dashboard/pa-transactions/components/TransactionDetailPrimitives";
import { DetailGroup } from "@/features/dashboard/my-merchants/components/MerchantSections";
import { statusMetaFor } from "@/features/dashboard/transaction-overview/columns";
import { MerchantTransactionsTable } from "@/features/dashboard/merchant-portfolio/components/MerchantTransactionsTable";
import {
  PortfolioStatusBadge,
  ProductTags,
  SettlementBadge,
  inr,
} from "@/features/dashboard/merchant-portfolio/components/PortfolioBits";
import {
  COMPARISON_LABEL,
  PERIOD_CAPTION,
  PERIOD_OPTIONS,
  PRODUCT_LABEL,
  changePctFor,
  figuresFor,
  formatDate,
  lifetimeFigures,
  merchantTransactions,
  volumeTrend,
} from "@/features/dashboard/merchant-portfolio/derive";
import { usePortfolioMerchant } from "@/features/dashboard/merchant-portfolio/hooks";
import type { PortfolioMerchant } from "@/features/dashboard/merchant-portfolio/types";

const LIST_PATH = "/merchant-portfolio";

type DetailPeriod = "month" | "quarter" | "year";
type DetailTab = "overview" | "transactions";

const DETAIL_PERIODS = PERIOD_OPTIONS.filter((o) => o.value !== "custom") as {
  value: DetailPeriod;
  label: string;
}[];

function copy(value: string, label: string) {
  void navigator.clipboard
    .writeText(value)
    .then(() => toast.success(`${label} copied`))
    .catch(() => undefined);
}

/**
 * /merchant-portfolio/[merchantId]: "Show me everything I need to understand
 * this merchant's business." One route, reached from the portfolio table,
 * Transaction Overview's merchant links and Merchant Activation's "View
 * portfolio". Identity and actions, a compact performance strip, then
 * Transactions (the default) or Overview beside a persistent information
 * panel. One column below lg: identity, performance, transactions, details.
 */
export function PortfolioDetailRoute({ merchantId }: { merchantId: string }) {
  const router = useRouter();
  const { data: merchant, isError } = usePortfolioMerchant(merchantId);

  if (!merchant || isError) {
    return (
      <div className="page-enter mx-auto max-w-[1400px]">
        <PlaceholderState
          variant={isError ? "error" : "404"}
          title={isError ? "Couldn't load this merchant" : "Merchant not found"}
          description="This merchant isn't in your portfolio. Merchants appear here once they go live."
          className="py-16"
          action={
            <Button variant="outline" size="sm" onClick={() => router.push(LIST_PATH)}>
              Back to Merchant Portfolio
            </Button>
          }
        />
      </div>
    );
  }
  return <PortfolioDetail merchant={merchant} />;
}

function PortfolioDetail({ merchant }: { merchant: PortfolioMerchant }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nowMs] = useState(() => Date.now());
  const [tab, setTab] = useState<DetailTab>(() =>
    searchParams.get("tab") === "overview" ? "overview" : "transactions"
  );
  const [period, setPeriod] = useState<DetailPeriod>("month");
  const [transactions] = useState(() => merchantTransactions(merchant, nowMs));
  const isDeactivated = merchant.status === "DEACTIVATED";

  return (
    <div className="page-enter mx-auto max-w-[1400px] space-y-5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        leftIcon={<Icon name="chevron-left" className="h-4 w-4" />}
        onClick={() => router.push(LIST_PATH)}
        className="pl-0 text-primary hover:text-primary-hover"
      >
        Back to Merchant Portfolio
      </Button>

      {/* Identity and actions */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{merchant.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PortfolioStatusBadge merchant={merchant} />
            <ProductTags merchant={merchant} />
          </div>
          <p className="mt-2 text-[12px] text-muted-foreground">
            Merchant ID · <span className="font-mono">{merchant.merchantId}</span>
          </p>
        </div>
        <HeaderActions merchant={merchant} />
      </div>

      {isDeactivated && (
        <Card className="shadow-none gap-0 border-border bg-muted/40 p-4">
          <p className="text-[13px] text-foreground">
            <span className="font-semibold">
              Deactivated on {formatDate(merchant.deactivatedOn!)}.
            </span>{" "}
            <span className="text-muted-foreground">
              Last active {formatDate(merchant.lastTransactionAt)}. This merchant&apos;s history
              stays part of your portfolio.
            </span>
          </p>
        </Card>
      )}

      <PerformanceStrip merchant={merchant} period={period} onPeriodChange={setPeriod} />

      <Separator />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <UnderlineTabs
            tabs={[
              { value: "transactions", label: "Transactions" },
              { value: "overview", label: "Overview" },
            ]}
            value={tab}
            onValueChange={(v) => setTab(v as DetailTab)}
          />
          {tab === "transactions" ? (
            <MerchantTransactionsTable merchant={merchant} transactions={transactions} />
          ) : (
            <OverviewTab
              merchant={merchant}
              period={period}
              onPeriodChange={setPeriod}
              transactions={transactions}
              onViewAll={() => setTab("transactions")}
            />
          )}
        </div>
        <div className="min-w-0 lg:sticky lg:top-4">
          <MerchantInfoPanel merchant={merchant} />
        </div>
      </div>
    </div>
  );
}

function HeaderActions({ merchant }: { merchant: PortfolioMerchant }) {
  const router = useRouter();
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
            leftIcon={<Icon name="more-horizontal" className="h-3.5 w-3.5" />}
            className="shadow-none"
          >
            More
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => copy(merchant.merchantId, "Merchant ID")}>
            Copy merchant ID
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
          {merchant.onboardingId && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() =>
                  router.push(`/my-merchants/${encodeURIComponent(merchant.onboardingId!)}`)
                }
              >
                View onboarding history
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Four compact figures for the period, in one card. A deactivated merchant
 *  shows its whole history instead, so nothing reads as zero. */
function PerformanceStrip({
  merchant,
  period,
  onPeriodChange,
}: {
  merchant: PortfolioMerchant;
  period: DetailPeriod;
  onPeriodChange: (p: DetailPeriod) => void;
}) {
  const life = lifetimeFigures(merchant);
  const f = life ?? figuresFor(merchant, period);
  const caption = life ? "All time" : PERIOD_CAPTION[period];
  const pct = life ? undefined : changePctFor(merchant, period);
  const stats = [
    { label: "Gross volume", value: inr(f.grossVolume), trend: pct },
    { label: "Transactions", value: f.transactions.toLocaleString("en-IN"), trend: pct },
    { label: "Commission earned", value: inr(f.commission), trend: pct },
    {
      label: "Average transaction",
      value: inr(f.transactions > 0 ? f.grossVolume / f.transactions : 0),
    },
  ];
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionLabel>Performance</SectionLabel>
        {!life && (
          <TimeRangeTabs
            options={DETAIL_PERIODS}
            value={period}
            onValueChange={onPeriodChange}
            label="Performance period"
          />
        )}
      </div>
      <Card className="shadow-none gap-0 p-0">
        <dl className="grid grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={
                "flex flex-col gap-1 p-4 " +
                (i % 2 === 1 ? "border-l border-border " : "") +
                (i >= 2 ? "border-t border-border lg:border-t-0 " : "") +
                (i === 2 ? "lg:border-l" : "")
              }
            >
              <dt className="text-[12px] font-medium text-muted-foreground">{s.label}</dt>
              <dd className="text-xl font-bold tracking-tight tabular-nums text-foreground">
                {s.value}
              </dd>
              <dd className="text-[11px] text-muted-foreground">
                {s.trend !== undefined ? (
                  <span
                    className={
                      s.trend >= 0
                        ? "font-medium text-emerald-600 dark:text-emerald-400"
                        : "font-medium text-red-600 dark:text-red-400"
                    }
                  >
                    {s.trend >= 0 ? "+" : ""}
                    {s.trend}% {COMPARISON_LABEL[period]}
                  </span>
                ) : (
                  caption
                )}
              </dd>
            </div>
          ))}
        </dl>
      </Card>
    </section>
  );
}

/** Is this merchant active, is volume growing, what is it earning me? One
 *  trend and the latest payments; not an analytics dashboard. */
function OverviewTab({
  merchant,
  period,
  onPeriodChange,
  transactions,
  onViewAll,
}: {
  merchant: PortfolioMerchant;
  period: DetailPeriod;
  onPeriodChange: (p: DetailPeriod) => void;
  transactions: ReturnType<typeof merchantTransactions>;
  onViewAll: () => void;
}) {
  const f = figuresFor(merchant, period);
  const pct = changePctFor(merchant, period);
  const recent = transactions.slice(0, 5);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <TimeRangeTabs
          options={DETAIL_PERIODS}
          value={period}
          onValueChange={onPeriodChange}
          label="Overview period"
        />
      </div>
      <PaymentLinkMetricCard
        className="shadow-none"
        title="Gross volume"
        value={inr(f.grossVolume)}
        trendLabel={
          pct !== undefined
            ? `${pct >= 0 ? "+" : ""}${pct}% ${COMPARISON_LABEL[period]}`
            : `${PERIOD_CAPTION[period]} · not enough history to compare`
        }
        trendPositive={pct === undefined || pct >= 0}
        data={volumeTrend(merchant, period)}
        accentColor="var(--chart-2)"
        formatTooltipValue={inr}
        formatAxisValue={inr}
      />
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <SectionLabel>Latest transactions</SectionLabel>
          <Button
            type="button"
            variant="link"
            className="h-auto min-h-0 p-0 text-xs"
            onClick={onViewAll}
          >
            View all transactions
          </Button>
        </div>
        <Card className="shadow-none gap-0 p-0">
          {recent.length === 0 ? (
            <p className="p-5 text-[13px] text-muted-foreground">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((t) => {
                const status = statusMetaFor(t);
                return (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-foreground">
                        {t.customerName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {status.label} · {formatTransactionTimestamp(t.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <SettlementBadge state={t.settlement} />
                      <span className="whitespace-nowrap text-[13px] font-semibold tabular-nums text-foreground">
                        {formatCurrency(t.amount, t.currency, "en-US")}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}

/** The merchant's context, only the fields the data carries. */
function MerchantInfoPanel({ merchant }: { merchant: PortfolioMerchant }) {
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>Merchant</SectionLabel>
      <Card className="shadow-none gap-0 p-5">
        <div className="flex flex-col gap-5">
          <DetailGroup title={merchant.name}>
            <DetailRow label="Status" value={<PortfolioStatusBadge merchant={merchant} />} />
            <DetailRow
              label="Merchant ID"
              value={
                <CopyableCell
                  value={merchant.merchantId}
                  copyValue={merchant.merchantId}
                  label="Merchant ID"
                  monospace
                  className="text-[13px]"
                />
              }
            />
            <DetailRow label="Live since" value={formatDate(merchant.liveSince)} />
          </DetailGroup>
          <DetailGroup title="Contact">
            <DetailRow label="Email" value={<span className="break-all">{merchant.email}</span>} />
            <DetailRow label="Phone" value={merchant.phone} />
          </DetailGroup>
          <DetailGroup title="Products">
            <div className="flex flex-col gap-1 text-[13px] font-medium text-foreground">
              {merchant.products.map((p) => (
                <span key={p}>{PRODUCT_LABEL[p]}</span>
              ))}
            </div>
          </DetailGroup>
          <DetailGroup title="Business">
            <DetailRow label="Business type" value={merchant.businessType} />
            <DetailRow label="Country" value={merchant.country} />
            {merchant.website && <DetailRow label="Website" value={merchant.website} />}
          </DetailGroup>
          <DetailGroup title="Referral">
            <DetailRow label="Referral type" value={merchant.referral.type} />
            <DetailRow label="Referral date" value={formatDate(merchant.referral.date)} />
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
        </div>
      </Card>
    </section>
  );
}
