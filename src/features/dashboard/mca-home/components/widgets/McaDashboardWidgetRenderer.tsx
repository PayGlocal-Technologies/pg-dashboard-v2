"use client";

import { useRouter } from "next/navigation";
import { McaStatCard } from "@/features/dashboard/mca-home/components/McaStatCard";
import { McaSavedAmountCard } from "@/features/dashboard/mca-home/components/McaSavedAmountCard";
import { McaSettlementSpeedCard } from "@/features/dashboard/mca-home/components/McaSettlementSpeedCard";
import { McaInvoiceOriginsCard } from "@/features/dashboard/mca-home/components/McaInvoiceOriginsCard";
import { McaInvoiceTrendCard } from "@/features/dashboard/mca-home/components/McaInvoiceTrendCard";
import { McaCurrencySplitCard } from "@/features/dashboard/mca-home/components/McaCurrencySplitCard";
import { McaTotalInvoicedCard } from "@/features/dashboard/mca-home/components/McaTotalInvoicedCard";
import { McaClientAnalyticsCard } from "@/features/dashboard/mca-home/components/McaClientAnalyticsCard";
import { mcaStatWidgetData } from "@/features/dashboard/mca-home/mock-data";
import type { McaWidgetId } from "@/features/dashboard/mca-home/widget-catalog";

export function McaDashboardWidgetRenderer({ widgetId }: { widgetId: McaWidgetId }) {
  const router = useRouter();

  switch (widgetId) {
    case "transactions":
      return <McaInvoiceOriginsCard />;
    case "total-invoiced":
      return <McaTotalInvoicedCard />;
    case "invoice-trend":
      return <McaInvoiceTrendCard />;
    case "currency-split":
      return <McaCurrencySplitCard />;
    case "saved-amount":
      return <McaSavedAmountCard />;
    case "avg-payment-time":
      return <McaSettlementSpeedCard />;
    case "client-analytics":
      // Same destination as the page's own "Explore your business" section
      // used before this card moved into the widget grid (handleViewClients
      // in mca-home/index.tsx) — resolved here instead of threaded through
      // as a prop, since every other widget in this grid is self-contained.
      return <McaClientAnalyticsCard onViewAll={() => router.push("/client-management")} />;
    default:
      return <McaStatCard data={mcaStatWidgetData[widgetId]} />;
  }
}
