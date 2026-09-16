"use client";

import { McaStatCard } from "@/features/dashboard/mca-home/components/McaStatCard";
import { McaSavedAmountCard } from "@/features/dashboard/mca-home/components/McaSavedAmountCard";
import { McaSettlementSpeedCard } from "@/features/dashboard/mca-home/components/McaSettlementSpeedCard";
import { McaInvoiceOriginsCard } from "@/features/dashboard/mca-home/components/McaInvoiceOriginsCard";
import { McaInvoiceTrendCard } from "@/features/dashboard/mca-home/components/McaInvoiceTrendCard";
import { McaCurrencySplitCard } from "@/features/dashboard/mca-home/components/McaCurrencySplitCard";
import { McaTotalInvoicedCard } from "@/features/dashboard/mca-home/components/McaTotalInvoicedCard";
import { mcaStatWidgetData } from "@/features/dashboard/mca-home/mock-data";
import type { McaWidgetId } from "@/features/dashboard/mca-home/widget-catalog";

export function McaDashboardWidgetRenderer({ widgetId }: { widgetId: McaWidgetId }) {
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
    default:
      return <McaStatCard data={mcaStatWidgetData[widgetId]} />;
  }
}
