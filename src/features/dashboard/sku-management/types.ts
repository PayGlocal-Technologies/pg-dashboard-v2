/** Whether a SKU is a physical good (HSN-coded) or a service (SAC-coded). */
export type SkuProductType = "GOODS" | "SERVICES";

/**
 * The currencies a SKU can be priced in — the seven the merchant holds local
 * receiving accounts for. Declared as a union rather than a bare `string` so a
 * row can't be priced in a currency the merchant can't actually settle in.
 * See SKU_CURRENCIES in constants.ts for the runtime list.
 */
export type SkuCurrency = "USD" | "GBP" | "EUR" | "CAD" | "AED" | "AUD" | "SGD";

/** The two money fields the table lets a merchant edit in place. */
export type SkuPriceField = "sellingPrice" | "productCost";

export interface SkuProduct {
  id: string;
  name: string;
  /**
   * The item's media, primary image first — the Product cell shows images[0]
   * and ignores the rest. One ordered list rather than a separate
   * primary/gallery pair, so "the first one is the primary" stays true by
   * construction and reordering never needs two fields kept in step.
   *
   * Optional throughout: the catalogue lets a merchant create an item before
   * uploading artwork for it, and the Product cell falls back to a type glyph
   * (see ProductThumbnail) rather than an empty box.
   */
  images?: string[];
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

/**
 * The item form's working shape — one model shared by Add and Edit, mapping
 * field-for-field onto SkuProduct. Prices and the two enums are held as
 * strings because that is what an empty input and an unmade select choice
 * actually are; validation is what turns them into a SkuProduct (see
 * schemas.ts). Keeping this distinct from SkuProduct is what lets the form
 * represent a half-filled item without SkuProduct having to admit
 * `type: "" | "GOODS" | "SERVICES"` everywhere it's read.
 */
export interface SkuItemFormValues {
  name: string;
  type: SkuProductType | "";
  hsnSac: string;
  currency: SkuCurrency | "";
  sellingPrice: string;
  productCost: string;
  description: string;
  images: SkuMediaItem[];
}

/** One uploaded image: a local preview URL plus the file it came from. */
export interface SkuMediaItem {
  id: string;
  url: string;
  name: string;
}
