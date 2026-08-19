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
  /** Only shown while the header's product context matches, see
   * useProductContext.ts. Omit for items shared by both products. */
  product?: ProductType;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

// ─── Home navigation (Header's "Home" tab, the combined overview) ─────────────
// Deliberately short, 3 top-level items only, the full Payments/MCA feature
// tree below only makes sense once the merchant has picked a product.

export const homeNavigation: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "layout-grid", permission: [] },
      { label: "Reports", href: "/settlement-report", icon: "file-text", permission: [] },
      {
        label: "Settings",
        href: "/settings",
        icon: "settings",
        permission: [],
        children: [{ label: "Team Management", href: "/team-management", permission: [] }],
      },
    ],
  },
];

// ─── Regular merchant navigation ──────────────────────────────────────────────
// Shown once the Header's "Payments" tab is active (see useProductContext.ts),
// not for "Home" or "Multi-Currency Accounts", which have their own trees
// above and below.

export const regularNavigation: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/pa-dashboard",
        icon: "layout-grid",
        permission: [],
        product: "PA",
      },
      {
        label: "Dashboard",
        href: "/mca-dashboard",
        icon: "layout-grid",
        permission: [],
        product: "PACB",
      },
    ],
  },
  {
    label: "Payments",
    items: [
      {
        // Top-level rather than nested under Payment Products, mirroring the
        // MCA tree. /pa-transactions is this tree's table: regularNavigation
        // only renders while the Header's "Payments" tab is active, MCA has
        // its own tree with its own /mca-transactions entry.
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
        children: [
          // Multi Currency Accounts and Platforms live in the MCA tree only
          // (as "International Accounts" and "Connect Platforms"), they are
          // not Payments products.
          { label: "MCA Links", href: "/mca-links", permission: [], product: "PACB" },
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
        href: "/settlement-report",
        icon: "file-text",
        permission: ["getAllSettlementDetailReports", "getSettlementReport"],
      },
      {
        label: "Invoice Management",
        href: "/mca-invoices",
        icon: "receipt",
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
      // equivalent. Gated on getAllMcaClient, the permission pg-dashboard puts on
      // the same page: the page now genuinely calls that endpoint (the client list
      // is server-backed), so hiding it from a user who cannot call it is correct
      // — which was not true while it read a local client book.
      {
        label: "Client Management",
        href: "/client-management",
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

// ─── MCA navigation ────────────────────────────────────────────────────────────
// Shown instead of regularNavigation while the Header's "Multi-Currency
// Accounts" tab is active, a dedicated tree (not the PA/PACB-shared one
// above) since MCA's feature set and grouping differ enough that tagging
// items with product:"PACB" on the shared tree stopped making sense.

export const mcaNavigation: NavGroup[] = [
  {
    label: "Home",
    items: [{ label: "Dashboard", href: "/mca-dashboard", icon: "layout-grid", permission: [] }],
  },
  {
    label: "Payments",
    items: [
      {
        // /mca-transactions, not /transactions: the single segment-toggled
        // page this tree was designed against has since been split into the
        // PA and MCA tables, and the MCA one is this tree's product.
        label: "Transactions",
        href: "/mca-transactions",
        icon: "repeat",
        permission: ["getTxnSearchResults"],
      },
      {
        // /mca-settlement-report, the MCA twin of the shared /settlement-report
        // route the Home and Payments trees use, see settlement-reports/routes.ts.
        label: "Settlements",
        href: "/mca-settlement-report",
        icon: "file-text",
        permission: ["getAllSettlementDetailReports", "getSettlementReport"],
      },
      { label: "Invoice Management", href: "/mca-invoices", icon: "receipt", permission: [] },
    ],
  },
  {
    label: "Accounts",
    items: [
      // /multi-currency, this app's existing virtual-accounts page, rather
      // than the /international-accounts route this tree was designed
      // against, which was never built.
      { label: "International Accounts", href: "/multi-currency", icon: "globe-2", permission: [] },
      // /platforms, this app's existing Platforms page, rather than the
      // /connect-platforms route this tree was designed against, which was
      // never built.
      { label: "Connect Platforms", href: "/platforms", icon: "link", permission: [] },
    ],
  },
  {
    label: "Compliance Center",
    items: [
      { label: "eBRC", href: "/ebrc", icon: "badge-check", permission: [] },
      { label: "EDPMS", href: "/edpms", icon: "shield-check", permission: [] },
      { label: "GST Invoices", href: "/gst-invoices", icon: "percent", permission: [] },
    ],
  },
  {
    label: "Administration",
    items: [
      // /client-management, not pg-dashboard's /mca-clients route: this app
      // has its own page, gated on the same getAllMcaClient permission.
      {
        label: "Client management",
        href: "/client-management",
        icon: "users",
        permission: ["getAllMcaClient"],
      },
      { label: "SKU management", href: "/sku-management", icon: "package", permission: [] },
      { label: "Team management", href: "/team-management", icon: "user-plus", permission: [] },
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
        href: "/settlement-report",
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
