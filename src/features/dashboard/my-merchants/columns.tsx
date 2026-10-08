import type { Column } from "@/components/ui";
import {
  AttentionIndicator,
  LifecycleBadge,
  ProductBadges,
} from "@/features/dashboard/my-merchants/components/MerchantSections";
import { formatRelative } from "@/features/dashboard/my-merchants/derive";
import type { PartnerMerchant } from "@/features/dashboard/my-merchants/types";

/** The list's columns: who, what, how to reach them, where they are, who
 *  has to act, and when anything last happened. Onboarding detail lives in
 *  the drawer, not here. */
export function buildMerchantColumns(nowMs: number): Column<PartnerMerchant>[] {
  return [
    {
      key: "merchant",
      header: "Merchant",
      minWidth: 220,
      cellClassName: "pl-5",
      render: (m) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-foreground">{m.name}</p>
          <p className="truncate text-[12px] text-muted-foreground">
            {m.businessName ?? (m.assisted ? "Assisted onboarding" : "Business details pending")}
          </p>
        </div>
      ),
    },
    {
      key: "products",
      header: "Product",
      minWidth: 120,
      render: (m) => <ProductBadges merchant={m} compact />,
    },
    {
      key: "contact",
      header: "Contact",
      minWidth: 220,
      render: (m) => (
        <div className="min-w-0">
          <p className="truncate text-[12px] font-medium text-foreground">{m.email}</p>
          <p className="text-[12px] text-muted-foreground">{m.phone}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      minWidth: 130,
      render: (m) => <LifecycleBadge merchant={m} />,
    },
    {
      key: "attention",
      header: "Attention",
      minWidth: 210,
      render: (m) => <AttentionIndicator merchant={m} nowMs={nowMs} />,
    },
    {
      key: "updatedAt",
      header: "Last activity",
      minWidth: 120,
      render: (m) => (
        <span className="whitespace-nowrap text-[12px] font-medium text-foreground">
          {formatRelative(m.updatedAt, nowMs)}
        </span>
      ),
    },
  ];
}
