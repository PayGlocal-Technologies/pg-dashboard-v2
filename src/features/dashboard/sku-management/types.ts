/** Whether a SKU is a physical good (HSN-coded) or a service (SAC-coded). */
export type SkuProductType = "GOODS" | "SERVICES";

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
  /** ISO 4217 code both prices are quoted in. */
  currency: string;
  description: string;
}
