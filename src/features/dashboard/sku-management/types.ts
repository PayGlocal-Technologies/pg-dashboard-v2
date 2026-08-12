/** Whether a SKU is a physical good (HSN-coded) or a service (SAC-coded). */
export type SkuProductType = "GOODS" | "SERVICES";

/**
 * The currencies a SKU can be priced in — the seven the merchant holds local
 * receiving accounts for. Declared as a union rather than a bare `string` so a
 * row can't be priced in a currency the merchant can't actually settle in.
 * See SKU_CURRENCIES in constants.ts for the runtime list.
 */
export type SkuCurrency = "USD" | "GBP" | "EUR" | "CAD" | "AED" | "AUD" | "SGD";

export interface SkuProduct {
  id: string;
  name: string;
  /**
   * Product image preview. Optional: the catalogue lets merchants add an item
   * before they upload artwork for it, so the Product cell falls back to a
   * type glyph (see ProductCell in columns.tsx) rather than an empty box.
   */
  imageUrl?: string;
  type: SkuProductType;
  /** HSN code for goods, SAC code for services — one column, both schemes. */
  hsnSac: string;
  sellingPrice: number;
  productCost: number;
  /**
   * ISO 4217 code both prices above are quoted in — one field, not one per
   * price, so a product's selling price and cost can never end up in
   * different currencies and make the margin between them meaningless.
   */
  currency: SkuCurrency;
  description: string;
}
