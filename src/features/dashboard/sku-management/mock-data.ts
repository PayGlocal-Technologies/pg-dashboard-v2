import type { SkuProduct } from "@/features/dashboard/sku-management/types";

/**
 * Placeholder catalogue for the SKU management page. There is no SKU/catalogue
 * endpoint yet, so this module stands in for one — the same arrangement as the
 * Transactions page's settlement analytics (see transactions/mock-data.ts).
 * Wiring the backend up should mean replacing this source with a `useGet` call
 * that returns the same `SkuProduct[]` shape, not touching the table.
 *
 * `imageUrl` is deliberately left unset on every row: the artwork ships with
 * the real catalogue, and the Product cell already renders a type glyph in the
 * 70x70 slot whenever it's missing.
 */
export const MOCK_SKU_PRODUCTS: SkuProduct[] = [
  {
    id: "sku-001",
    name: "Noise Cancelling Headphones",
    type: "GOODS",
    hsnSac: "85183000",
    sellingPrice: 18_999,
    productCost: 12_400,
    currency: "INR",
    description: "Over-ear wireless headphones with active noise cancellation and 30h battery.",
  },
  {
    id: "sku-002",
    name: "Brand Strategy Consultation",
    type: "SERVICES",
    hsnSac: "998311",
    sellingPrice: 45_000,
    productCost: 21_000,
    currency: "INR",
    description: "Two-week engagement covering positioning, messaging, and go-to-market plan.",
  },
  {
    id: "sku-003",
    name: "Mechanical Keyboard 87-Key",
    type: "GOODS",
    hsnSac: "84716060",
    sellingPrice: 7_499,
    productCost: 4_150,
    currency: "INR",
    description: "Hot-swappable tenkeyless board with PBT keycaps and USB-C detachable cable.",
  },
  {
    id: "sku-004",
    name: "Website Maintenance Retainer",
    type: "SERVICES",
    hsnSac: "998314",
    sellingPrice: 25_000,
    productCost: 9_800,
    currency: "INR",
    description: "Monthly retainer covering uptime monitoring, patches, and content updates.",
  },
  {
    id: "sku-005",
    name: "Cotton Crew Neck T-Shirt",
    type: "GOODS",
    hsnSac: "61091000",
    sellingPrice: 1_299,
    productCost: 420,
    currency: "INR",
    description: "240 GSM combed cotton tee, pre-shrunk, available in six colourways.",
  },
  {
    id: "sku-006",
    name: "Product Photography Session",
    type: "SERVICES",
    hsnSac: "998383",
    sellingPrice: 32_000,
    productCost: 14_500,
    currency: "INR",
    description: "Half-day studio shoot, up to 25 catalogue-ready images with retouching.",
  },
  {
    id: "sku-007",
    name: "Stainless Steel Water Bottle",
    type: "GOODS",
    hsnSac: "96170019",
    sellingPrice: 1_899,
    productCost: 610,
    currency: "INR",
    description: "750ml double-walled vacuum flask, keeps drinks cold 24h and hot 12h.",
  },
  {
    id: "sku-008",
    name: "Payment Integration Setup",
    type: "SERVICES",
    hsnSac: "998313",
    sellingPrice: 60_000,
    productCost: 27_500,
    currency: "INR",
    description: "One-time onboarding: checkout integration, webhooks, and a UAT sign-off.",
  },
  {
    id: "sku-009",
    name: "Leather Laptop Sleeve 14\"",
    type: "GOODS",
    hsnSac: "42021290",
    sellingPrice: 3_499,
    productCost: 1_280,
    currency: "INR",
    description: "Full-grain leather sleeve with felt lining, fits 14-inch notebooks.",
  },
  {
    id: "sku-010",
    name: "Quarterly Compliance Audit",
    type: "SERVICES",
    hsnSac: "998221",
    sellingPrice: 88_000,
    productCost: 40_000,
    currency: "INR",
    description: "PCI DSS and RBI PA/PG readiness review with a remediation checklist.",
  },
  {
    id: "sku-011",
    name: "Desk Organiser Tray",
    type: "GOODS",
    hsnSac: "39241090",
    sellingPrice: 949,
    productCost: 310,
    currency: "INR",
    description: "Three-compartment bamboo tray for cables, stationery, and cards.",
  },
  {
    id: "sku-012",
    name: "Copywriting Package",
    type: "SERVICES",
    hsnSac: "998393",
    sellingPrice: 18_500,
    productCost: 7_200,
    currency: "INR",
    description: "Ten long-form pages of landing and product copy, two revision rounds.",
  },
];
