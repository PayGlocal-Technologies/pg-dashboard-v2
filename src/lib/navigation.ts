import type { IconName } from "@/components/icon";
import type { ProductType } from "@/lib/hooks/useResolvedMids";

export type NavChild = {
  label: string;
  href: string;
  permission?: string[];
  /** Only shown while the header's product context matches, see
   * useProductContext.ts. Omit for items shared by both products. */
  product?: ProductType;
};

export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
  badge?: string;
  permission?: string[];
  children?: NavChild[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

// ─── Regular merchant navigation ──────────────────────────────────────────────

export const regularNavigation: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Home", href: "/dashboard", icon: "layout-grid", permission: [] }],
  },
  {
    label: "Payments",
    items: [
      {
        label: "Payment Products",
        href: "/payment-products",
        icon: "shopping-cart",
        permission: [],
        children: [
          { label: "Multi Currency Accounts", href: "/multi-currency", permission: [] },
          // Two separate entries, both labelled "Transactions": the first is
          // the MCA table, the second the PA (Cards/UPI/NetBanking) one. They
          // used to be a single item whose page carried a segment toggle.
          //
          // Tagged by product so the header's switcher surfaces one at a time
          // (see useProductContext.ts) — untagged, both would render as two
          // identical "Transactions" rows side by side.
          {
            label: "Transactions",
            href: "/mca-transactions",
            permission: ["getTxnSearchResults"],
            product: "PACB",
          },
          {
            label: "Transactions",
            href: "/pa-transactions",
            permission: ["getTxnSearchResults"],
            product: "PA",
          },
          { label: "MCA Links", href: "/mca-links", permission: [], product: "PACB" },
          { label: "Platforms", href: "/platforms", permission: [] },
          { label: "Payment Links", href: "/payment-links", permission: [], product: "PA" },
          { label: "Invoice Links", href: "/invoice-links", permission: [] },
          { label: "Payment Button", href: "/payment-button", permission: [] },
        ],
      },
      {
        label: "SKU Management",
        href: "/sku-management",
        icon: "package",
        badge: "NEW",
        permission: [],
      },
      {
        label: "Manage Mandates",
        href: "/manage-mandates",
        icon: "credit-card",
        permission: ["mandateResults", "mandateResultsMerchantContext"],
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        label: "Settlement Reports",
        href: "/reports/settlement-report",
        icon: "file-text",
        permission: ["getAllSettlementDetailReports", "getSettlementReport"],
      },
      {
        label: "Invoice Management",
        href: "/mca-invoices",
        icon: "receipt",
        badge: "NEW",
        permission: ["getAllMerchantInvoice"],
      },
      {
        label: "Invoice History",
        href: "/invoice-download",
        icon: "file-text",
        permission: ["getInvoices", "downloadInvoice"],
      },
      {
        label: "Regularise Bills",
        href: "/shipping-bill-regularisation",
        icon: "file-text",
        permission: ["showEdpms"],
      },
      {
        label: "eBRC",
        href: "/ebrc",
        icon: "badge-check",
        permission: ["processEbrcRequest"],
        children: [
          { label: "eBRC Generation", href: "/ebrc-generation", permission: [] },
          { label: "IRM Repository", href: "/irm-repository", permission: [] },
        ],
      },
    ],
  },
  {
    label: "Risk",
    items: [
      {
        label: "Dispute Management",
        href: "/dispute-management",
        icon: "alert-triangle",
        badge: "NEW",
        permission: ["cbSearchResults"],
      },
    ],
  },
  {
    label: "Configure",
    items: [
      // Points at this app's own Client Management page (/client-management)
      // rather than pg-dashboard's /mca-clients route, which has no v2
      // equivalent. Ungated for the same reason SKU Management is: the page
      // reads a local client book (MOCK_CLIENTS) rather than the endpoint
      // getAllMcaClient guards, so gating on that permission would hide a page
      // that doesn't call it. Restore the permission once the real client
      // endpoint is wired up.
      {
        label: "Client Management",
        href: "/client-management",
        icon: "users",
        permission: [],
      },
      {
        label: "Configure",
        href: "/configure",
        icon: "settings",
        permission: ["ucicSearchV3", "getListOfMerchantKeys"],
        children: [
          { label: "Team Management", href: "/team-management", permission: ["ucicSearchV3"] },
          {
            label: "Key Management System",
            href: "/key-management-system",
            permission: ["getListOfMerchantKeys"],
          },
        ],
      },
      {
        label: "Scheduler",
        href: "/scheduler",
        icon: "clock",
        permission: ["merchantAdminReport"],
      },
    ],
  },
];

// ─── Partner navigation ────────────────────────────────────────────────────────

export const partnerNavigation: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Home", href: "/manage-merchants", icon: "layout-grid", permission: [] }],
  },
  {
    label: "Merchant",
    items: [
      { label: "Merchant Activation", href: "/my-merchants", icon: "users", permission: [] },
      {
        label: "Transactions",
        href: "/mca-transactions",
        icon: "repeat",
        permission: ["getTxnSearchResults"],
      },
      {
        label: "Transactions",
        href: "/pa-transactions",
        icon: "repeat",
        permission: ["getTxnSearchResults"],
      },
    ],
  },
  {
    label: "Partner",
    items: [
      { label: "Commissions", href: "/commission", icon: "file-text", permission: [] },
      { label: "Deals", href: "/partner-deals-dashboard", icon: "receipt", permission: [] },
    ],
  },
  {
    label: "Account",
    items: [
      {
        label: "Account Management",
        href: "/configure",
        icon: "settings",
        permission: ["ucicSearchV3", "getListOfMerchantKeys"],
        children: [
          { label: "Team Management", href: "/team-management", permission: ["ucicSearchV3"] },
          {
            label: "Key Management System",
            href: "/key-management-system",
            permission: ["getListOfMerchantKeys"],
          },
          { label: "Webhooks", href: "/partner-webhooks", permission: [] },
        ],
      },
    ],
  },
];

// ─── Global tenant navigation ──────────────────────────────────────────────────

export const globalNavigation: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Home", href: "/dashboard", icon: "layout-grid", permission: [] }],
  },
  {
    label: "Payments",
    items: [
      {
        label: "Transactions",
        href: "/mca-transactions",
        icon: "repeat",
        permission: ["getTxnSearchResults"],
      },
      {
        label: "Transactions",
        href: "/pa-transactions",
        icon: "repeat",
        permission: ["getTxnSearchResults"],
      },
      {
        label: "Payment Products",
        href: "/payment-products",
        icon: "shopping-cart",
        permission: [],
        children: [{ label: "Payment Links", href: "/payment-links", permission: [] }],
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        label: "Settlement Reports",
        href: "/reports/settlement-report",
        icon: "file-text",
        permission: ["getAllSettlementDetailReports", "getSettlementReport"],
      },
    ],
  },
  {
    label: "Risk",
    items: [
      {
        label: "Dispute Management",
        href: "/dispute-management",
        icon: "alert-triangle",
        permission: ["cbSearchResults"],
      },
    ],
  },
  {
    label: "Configure",
    items: [
      {
        label: "Configure",
        href: "/configure",
        icon: "settings",
        permission: ["ucicSearchV3", "getListOfMerchantKeys"],
        children: [
          { label: "Team Management", href: "/team-management", permission: ["ucicSearchV3"] },
          {
            label: "Key Management System",
            href: "/key-management-system",
            permission: ["getListOfMerchantKeys"],
          },
        ],
      },
    ],
  },
];
