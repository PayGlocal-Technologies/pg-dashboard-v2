import type { SkuProduct } from "@/features/dashboard/sku-management/types";

/**
 * Placeholder catalogue for the SKU management page. There is no SKU/catalogue
 * endpoint yet, so this module stands in for one — the same arrangement as the
 * Transactions page's settlement analytics (see transactions/mock-data.ts).
 * Wiring the backend up should mean replacing this source with a `useGet` call
 * that returns the same `SkuProduct[]` shape, not touching the table.
 *
 * `currency` is spread across all seven of SKU_CURRENCIES and varies row to
 * row, but it is assigned here as a literal rather than drawn from
 * `Math.random()` at runtime: random values would differ between the server
 * and client renders (a hydration mismatch) and change on every re-render,
 * which is exactly what CLAUDE.md's purity rule forbids. Both figures on a row
 * always share that row's currency — mixing them within a product would make
 * the margin between them meaningless.
 *
 * Prices are chosen to look like real catalogue figures in each currency
 * (a £1,450 consulting engagement, an S$38.90 bottle) rather than one amount
 * repeated, so the columns exercise short and long number widths alike.
 *
 * `images` points at the product photography in public/assets/sku/ — one
 * shot per GOODS row, and the first entry is the primary image the table
 * shows. The six SERVICES rows have none (a consulting engagement has no
 * product shot), so they fall back to the type glyph the Product cell renders
 * whenever the list is absent or empty. That fallback is not
 * dead code once the real catalogue lands: a merchant can create an item
 * before uploading artwork for it.
 */
export const MOCK_SKU_PRODUCTS: SkuProduct[] = [
  {
    id: "sku-001",
    name: "Noise Cancelling Headphones",
    images: ["/assets/sku/noise-cancelling-headphones.jpg"],
    type: "GOODS",
    hsnSac: "85183000",
    sellingPrice: 229,
    productCost: 148.5,
    currency: "USD",
    description: "Over-ear wireless headphones with active noise cancellation and 30h battery.",
  },
  {
    id: "sku-002",
    name: "Brand Strategy Consultation",
    type: "SERVICES",
    hsnSac: "998311",
    sellingPrice: 1_450,
    productCost: 620,
    currency: "GBP",
    description: "Two-week engagement covering positioning, messaging, and go-to-market plan.",
  },
  {
    id: "sku-003",
    name: "Mechanical Keyboard 87-Key",
    images: ["/assets/sku/mechanical-keyboard-87-key.png"],
    type: "GOODS",
    hsnSac: "84716060",
    sellingPrice: 89.9,
    productCost: 47.25,
    currency: "EUR",
    description: "Hot-swappable tenkeyless board with PBT keycaps and USB-C detachable cable.",
  },
  {
    id: "sku-004",
    name: "Website Maintenance Retainer",
    type: "SERVICES",
    hsnSac: "998314",
    sellingPrice: 420,
    productCost: 165,
    currency: "CAD",
    description: "Monthly retainer covering uptime monitoring, patches, and content updates.",
  },
  {
    id: "sku-005",
    name: "Cotton Crew Neck T-Shirt",
    images: ["/assets/sku/cotton-crew-neck-t-shirt.jpg"],
    type: "GOODS",
    hsnSac: "61091000",
    sellingPrice: 79,
    productCost: 26.5,
    currency: "AED",
    description: "240 GSM combed cotton tee, pre-shrunk, available in six colourways.",
  },
  {
    id: "sku-006",
    name: "Product Photography Session",
    type: "SERVICES",
    hsnSac: "998383",
    sellingPrice: 640,
    productCost: 285,
    currency: "AUD",
    description: "Half-day studio shoot, up to 25 catalogue-ready images with retouching.",
  },
  {
    id: "sku-007",
    name: "Stainless Steel Water Bottle",
    images: ["/assets/sku/stainless-steel-water-bottle.jpg"],
    type: "GOODS",
    hsnSac: "96170019",
    sellingPrice: 38.9,
    productCost: 12.4,
    currency: "SGD",
    description: "750ml double-walled vacuum flask, keeps drinks cold 24h and hot 12h.",
  },
  {
    id: "sku-008",
    name: "Payment Integration Setup",
    type: "SERVICES",
    hsnSac: "998313",
    sellingPrice: 1_850,
    productCost: 810,
    currency: "USD",
    description: "One-time onboarding: checkout integration, webhooks, and a UAT sign-off.",
  },
  {
    id: "sku-009",
    name: "Leather Laptop Sleeve 14\"",
    images: ["/assets/sku/leather-laptop-sleeve-14.png"],
    type: "GOODS",
    hsnSac: "42021290",
    sellingPrice: 64,
    productCost: 23.75,
    currency: "GBP",
    description: "Full-grain leather sleeve with felt lining, fits 14-inch notebooks.",
  },
  {
    id: "sku-010",
    name: "Quarterly Compliance Audit",
    type: "SERVICES",
    hsnSac: "998221",
    sellingPrice: 2_400,
    productCost: 1_120,
    currency: "EUR",
    description: "PCI DSS and RBI PA/PG readiness review with a remediation checklist.",
  },
  {
    id: "sku-011",
    name: "Desk Organiser Tray",
    images: ["/assets/sku/desk-organiser-tray.jpg"],
    type: "GOODS",
    hsnSac: "39241090",
    sellingPrice: 24.5,
    productCost: 8.9,
    currency: "CAD",
    description: "Three-compartment bamboo tray for cables, stationery, and cards.",
  },
  {
    id: "sku-012",
    name: "Copywriting Package",
    type: "SERVICES",
    hsnSac: "998393",
    sellingPrice: 520,
    productCost: 198,
    currency: "SGD",
    description: "Ten long-form pages of landing and product copy, two revision rounds.",
  },
];
