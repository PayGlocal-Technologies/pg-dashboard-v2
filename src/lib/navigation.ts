import type { IconName } from "@/components/icon";

export type NavChild = {
  label: string;
  href: string;
  permission?: string[];
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
    items: [
      { label: "Home", href: "/dashboard", icon: "layout-grid", permission: [] },
    ],
  },
  {
    label: "Payments",
    items: [
      {
        label: "Transactions",
        href: "/transactions",
        icon: "repeat",
        permission: ["getTxnSearchResults"],
      },
      {
        label: "Payment Products",
        href: "/payment-products",
        icon: "shopping-cart",
        permission: [],
        children: [
          { label: "Multi Currency Accounts", href: "/multi-currency", permission: [] },
          { label: "MCA Links", href: "/mca-links", permission: [] },
          { label: "Payment Links", href: "/payment-links", permission: [] },
          { label: "Invoice Links", href: "/invoice-links", permission: [] },
          { label: "Payment Button", href: "/payment-button", permission: [] },
        ],
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
      {
        label: "Client Management",
        href: "/mca-clients",
        icon: "users",
        permission: ["getAllMcaClient"],
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
    items: [
      { label: "Home", href: "/manage-merchants", icon: "layout-grid", permission: [] },
    ],
  },
  {
    label: "Merchant",
    items: [
      { label: "Merchant Activation", href: "/my-merchants", icon: "users", permission: [] },
      {
        label: "Transaction Overview",
        href: "/transactions",
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
    items: [
      { label: "Home", href: "/dashboard", icon: "layout-grid", permission: [] },
    ],
  },
  {
    label: "Payments",
    items: [
      {
        label: "Transactions",
        href: "/transactions",
        icon: "repeat",
        permission: ["getTxnSearchResults"],
      },
      {
        label: "Payment Products",
        href: "/payment-products",
        icon: "shopping-cart",
        permission: [],
        children: [
          { label: "Payment Links", href: "/payment-links", permission: [] },
        ],
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
