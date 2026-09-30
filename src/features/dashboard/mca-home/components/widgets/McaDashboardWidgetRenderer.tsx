"use client";

import { useRouter } from "next/navigation";
import { McaSavedAmountCard } from "@/features/dashboard/mca-home/components/McaSavedAmountCard";
import { McaInvoiceOriginsCard } from "@/features/dashboard/mca-home/components/McaInvoiceOriginsCard";
import { McaCurrencySplitCard } from "@/features/dashboard/mca-home/components/McaCurrencySplitCard";
import { McaTotalInvoicedCard } from "@/features/dashboard/mca-home/components/McaTotalInvoicedCard";
import { McaClientAnalyticsCard } from "@/features/dashboard/mca-home/components/McaClientAnalyticsCard";
import {
  ActiveInvoicesWidget,
  NextSettlementWidget,
  OutstandingAmountWidget,
  OverdueInvoicesWidget,
  TopCurrencyWidget,
} from "@/features/dashboard/mca-home/components/McaLiveStatWidgets";
import type { McaWidgetId } from "@/features/dashboard/mca-home/widget-catalog";

export function McaDashboardWidgetRenderer({ widgetId }: { widgetId: McaWidgetId }) {
  const router = useRouter();

  switch (widgetId) {
    case "transactions":
      return <McaInvoiceOriginsCard />;
    case "total-invoiced":
      return <McaTotalInvoicedCard />;
    case "currency-split":
      return <McaCurrencySplitCard />;
    case "saved-amount":
      return <McaSavedAmountCard />;
    case "outstanding-amount":
      return <OutstandingAmountWidget />;
    case "active-invoices":
      return <ActiveInvoicesWidget />;
    case "overdue-invoices":
      return <OverdueInvoicesWidget />;
    case "next-settlement":
      return <NextSettlementWidget />;
    case "top-currency":
      return <TopCurrencyWidget />;
    case "client-analytics":
      // Same destination as the page's own "Explore your business" section
      // used before this card moved into the widget grid (handleViewClients
      // in mca-home/index.tsx) — resolved here instead of threaded through
      // as a prop, since every other widget in this grid is self-contained.
      return <McaClientAnalyticsCard onViewAll={() => router.push("/client-management")} />;
  }
}
