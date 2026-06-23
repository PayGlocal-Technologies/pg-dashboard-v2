"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { BadgeVariant, BadgeTrailIcon } from "@payglocal_ui/flux-ui";
import {
  Button,
  Card,
  DataTable,
  type Column,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  StatusBadge,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import {
  recentTransactions,
  recentSettlements,
  type RecentTransaction,
  type RecentSettlement,
} from "@/features/dashboard/home/mock-data";
import { formatDate, formatCurrency, truncate } from "@/lib/utils/format";

// ── Status mapping: raw (lowercase) value → display meta ──────────────────────
type StatusMeta = { label: string; variant: BadgeVariant; trailIcon?: BadgeTrailIcon };

const STATUS_META: Record<string, StatusMeta> = {
  sent_for_capture: { label: "Sent for capture", variant: "success", trailIcon: "check" },
  in_progress: { label: "In progress", variant: "warning" },
  failed: { label: "Failed", variant: "danger", trailIcon: "x" },
  refunded: { label: "Refunded", variant: "refund", trailIcon: "refresh" },
  processing: { label: "Processing", variant: "warning" },
  settled: { label: "Settled", variant: "success", trailIcon: "check" },
};

function getStatusMeta(raw?: string): StatusMeta {
  if (!raw) return { label: "Unknown", variant: "muted" };
  return STATUS_META[raw.toLowerCase()] ?? { label: raw.replace(/_/g, " "), variant: "muted" };
}

// ── Card-brand logos via the static CDN (mirrors paColumns / mcaColumns) ──────
const STATIC_BASE = "https://static.payglocal.in/";

const CARD_BRAND_LOGO_MAPPER: Record<string, string> = {
  visa: "images/network/visa.v2.svg",
  mastercard: "images/network/mastercard-new.v1.svg",
  jcb: "images/network/jcb.v5.svg",
};

function CardBrand({ brand }: { brand?: string | null }) {
  const path = brand ? CARD_BRAND_LOGO_MAPPER[brand.toLowerCase()] : undefined;
  if (!path) {
    return (
      <span className="inline-flex h-5 w-8 items-center justify-center rounded border border-border bg-card text-muted-foreground">
        <Icon name="credit-card" className="h-4 w-4" aria-hidden />
      </span>
    );
  }
  return (
    <span className="inline-flex h-5 w-8 items-center justify-center overflow-hidden rounded border border-border bg-card">
      <Image
        src={STATIC_BASE + path}
        alt={brand ?? "Card"}
        width={26}
        height={16}
        className="h-3.5 w-5 object-contain"
        unoptimized
      />
    </span>
  );
}

function PaymentMethod({
  method,
  cardBrand,
  cardLast4,
}: {
  method: string;
  cardBrand?: string | null;
  cardLast4?: string | null;
}) {
  if (method === "card") {
    return (
      <div className="flex items-center gap-1.5">
        <CardBrand brand={cardBrand} />
        <span className="font-mono text-[13px] text-muted-foreground">•••• {cardLast4 ?? "—"}</span>
      </div>
    );
  }
  if (method === "upi") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex h-5 w-8 items-center justify-center rounded bg-muted text-[9px] font-black text-[#5f259f] dark:text-violet-300">
          UPI
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <Icon name="building-2" className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      <span className="text-[13px] text-muted-foreground">Netbanking</span>
    </div>
  );
}

// ── Column definitions ────────────────────────────────────────────────────────
const transactionColumns: Column<RecentTransaction>[] = [
  {
    key: "amount",
    header: "Amount",
    minWidth: 120,
    render: (row) => (
      <span className="whitespace-nowrap">
        <span className="text-[13px] font-semibold tabular-nums text-foreground">
          {formatCurrency(row.amount, row.currency)}
        </span>
        <span className="ml-1.5 text-[11px] font-medium text-muted-foreground">{row.currency}</span>
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    minWidth: 140,
    render: (row) => {
      const { label, variant, trailIcon } = getStatusMeta(row.status);
      return <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />;
    },
  },
  {
    key: "method",
    header: "Payment method",
    minWidth: 130,
    render: (row) => (
      <PaymentMethod method={row.method} cardBrand={row.cardBrand} cardLast4={row.cardLast4} />
    ),
  },
  {
    key: "customerName",
    header: "Customer name",
    minWidth: 145,
    render: (row) => (
      <span className="text-[13px] font-medium text-foreground">{row.customerName}</span>
    ),
  },
  {
    key: "email",
    header: "Email",
    minWidth: 185,
    render: (row) => <span className="text-[13px] text-muted-foreground">{row.email}</span>,
  },
  {
    key: "id",
    header: "Transaction ID",
    minWidth: 150,
    render: (row) => (
      <span className="cursor-pointer font-mono text-[13px] text-primary/70 transition-colors hover:text-primary">
        {row.id}
      </span>
    ),
  },
  {
    key: "date",
    header: "Date and time",
    minWidth: 150,
    render: (row) => (
      <span className="text-[13px] text-muted-foreground">{formatDate(row.date)}</span>
    ),
  },
];

const settlementColumns: Column<RecentSettlement>[] = [
  {
    key: "id",
    header: "Settlement ID",
    minWidth: 170,
    render: (row) => (
      <span className="cursor-pointer font-mono text-[13px] text-primary/70 transition-colors hover:text-primary">
        {truncate(row.id, 16)}
      </span>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    minWidth: 135,
    render: (row) => (
      <span className="text-[13px] font-semibold tabular-nums text-foreground">
        {formatCurrency(row.amount, row.currency)}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    minWidth: 125,
    render: (row) => {
      const { label, variant, trailIcon } = getStatusMeta(row.status);
      return <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />;
    },
  },
  {
    key: "bankAccount",
    header: "Bank",
    minWidth: 155,
    render: (row) => <span className="text-[13px] text-muted-foreground">{row.bankAccount}</span>,
  },
  {
    key: "transactionCount",
    header: "Transactions",
    minWidth: 110,
    render: (row) => (
      <span className="text-[13px] text-muted-foreground">{row.transactionCount} txns</span>
    ),
  },
  {
    key: "date",
    header: "Date",
    minWidth: 135,
    render: (row) => (
      <span className="text-[13px] text-muted-foreground">
        {formatDate(row.date, { year: "2-digit", month: "short", day: "2-digit" })}
      </span>
    ),
  },
];

const rowActionButton = (label: string) => (
  <Button variant="secondary" size="sm" className="text-[12px]">
    {label}
  </Button>
);

type RecentActivityTableProps = {
  transactions?: RecentTransaction[];
  settlements?: RecentSettlement[];
  isLoading?: boolean;
};

export function RecentActivityTable({
  transactions = recentTransactions,
  settlements = recentSettlements,
  isLoading,
}: RecentActivityTableProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"transactions" | "settlements">("transactions");

  return (
    <Card className="overflow-hidden p-0">
      {/* Card header */}
      <div className="flex items-center justify-between px-6 pb-0 pt-5">
        <h3 className="text-[15px] font-semibold text-foreground">Recent Activity</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[12px] font-medium text-primary hover:text-primary/80"
          onClick={() =>
            router.push(tab === "transactions" ? "/transactions" : "/settlement-reports")
          }
          rightIcon={<Icon name="arrow-right" className="h-3 w-3" aria-hidden />}
        >
          View all
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "transactions" | "settlements")}>
        <div className="px-6 pt-4">
          <TabsList className="h-8">
            <TabsTrigger value="transactions" className="h-7 px-3 text-[13px]">
              Transactions
            </TabsTrigger>
            <TabsTrigger value="settlements" className="h-7 px-3 text-[13px]">
              Settlements
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="transactions" className="mt-3">
          <DataTable<RecentTransaction>
            columns={transactionColumns}
            data={transactions.slice(0, 7)}
            rowKey={(row) => row.id}
            isLoading={isLoading}
            skeletonRows={7}
            className="rounded-none border-0 border-t border-border"
            emptyTitle="No recent transactions"
            rowAction={rowActionButton("View details")}
          />
        </TabsContent>

        <TabsContent value="settlements" className="mt-3">
          <DataTable<RecentSettlement>
            columns={settlementColumns}
            data={settlements}
            rowKey={(row) => row.id}
            isLoading={isLoading}
            skeletonRows={4}
            className="rounded-none border-0 border-t border-border"
            emptyTitle="No recent settlements"
            rowAction={rowActionButton("View report")}
          />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
