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
  /**
   * The merchant this item belongs to, as returned by the catalogue endpoint.
   * Carried on the row purely so update/delete/duplicate can address it: a
   * multi-MID merchant browsing every account at once has rows from several
   * MIDs on screen, and the path segment has to be the row's own MID, not the
   * one the search was made against. pg-dashboard does the same
   * (`record.mid || merchantId`). Never rendered.
   */
  mid?: string;
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
  /**
   * Null is a real value on a fetched row, not a missing one: the catalogue
   * endpoint returns `type: null` for items that predate the field or arrived
   * through pg-dashboard's file import without one. Production renders those as
   * a dash, so v2 does too rather than inventing a type for them. The form
   * requires a type, so nothing v2 creates can be null.
   */
  type: SkuProductType | null;
  /** HSN code for goods, SAC code for services — one column, both schemes. */
  hsnSac: string;
  sellingPrice: number;
  productCost: number;
  /**
   * ISO 4217 code both prices above are quoted in — one field, not one per
   * price, so a product's selling price and cost can never end up in
   * different currencies and make the margin between them meaningless.
   *
   * `string`, not SkuCurrency, on the *saved* record: the catalogue endpoint
   * returns whatever a row was priced in, including codes outside the seven the
   * form offers (legacy and imported rows). SkuItemFormValues below still
   * narrows to SkuCurrency, so a merchant can only ever *choose* one of the
   * seven — this widening only lets us render what already exists faithfully
   * instead of coercing it. formatCurrency takes a bare string, so nothing
   * about how a price is drawn changes.
   */
  currency: string;
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
  /**
   * `string`, not SkuCurrency: the select's options are fetched per merchant
   * (see useMcaCurrencies), so the set of valid codes is decided at runtime by
   * the merchant's configuration rather than by this union. "" is the unchosen
   * state. SkuCurrency and SKU_CURRENCY_OPTIONS survive as the fallback list the
   * form offers while that call is in flight.
   */
  currency: string;
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

// ── Catalogue API ───────────────────────────────────────────────────────────
// Mirror of pg-dashboard/src/features/sku-management/types.ts. These are the
// wire shapes; everything above this line is the shape the components render.
// The two are deliberately different, and hooks.ts is the only place that knows
// both (see toSkuProduct / toSkuMutationPayload) — no component ever sees a
// wire field name.

/**
 * The API's product-type enum. Singular where v2's SkuProductType is plural
 * (GOOD/SERVICE vs GOODS/SERVICES), which is exactly the kind of near-miss that
 * has to be mapped rather than cast.
 */
export type SkuApiType = "GOOD" | "SERVICE";

export interface SkuApiItem {
  id: string;
  mid: string;
  name: string;
  type: SkuApiType | null;
  hsnSac: string;
  /** Decimal strings, not numbers — "1850.00", not 1850. */
  unitPrice: string;
  costPrice: string | null;
  currency: string | null;
  description: string;
  /** Epoch millis, and its pre-formatted display twin. v2 renders neither: the
   *  catalogue table has no created-on column. Typed anyway so the envelope
   *  matches what actually arrives. */
  creationTime: number;
  formattedCreationDate: string;
}

/** `{ status, message, data: { totalCount, data } }` — the same double-nested
 *  envelope the transactions search returns, so `data.data.data` is the rows. */
export interface SkuSearchResponse {
  status: string;
  message: string;
  data: {
    totalCount: number;
    data: SkuApiItem[];
  };
}

/**
 * Create and update send the same body (POST /sku/{mid} and PUT
 * /sku/{mid}/{id}). Optionality is load-bearing and copied field-for-field from
 * pg-dashboard's buildPayload: `hsnSac`, `costPrice` and `description` are
 * spread in only when non-blank, so a cleared field is **absent** from the body
 * rather than sent as "". `type`, `name`, `unitPrice` and `currency` are always
 * present.
 */
export interface SkuMutationPayload {
  type: SkuApiType;
  name: string;
  hsnSac?: string;
  unitPrice: string;
  costPrice?: string;
  currency: string;
  description?: string;
}

// ── Bulk import API ─────────────────────────────────────────────────────────
// Mirror of pg-dashboard's ImportFromFileModal contracts. Note the snake_case
// keys: `template_url` and `upload_url` really are snake_case on the wire while
// everything around them is camel, so they are typed as they arrive rather than
// tidied up.

export interface SkuTemplateResponse {
  status: string;
  message: string;
  data: { template_url: string };
}

export interface SkuUploadInitiateResponse {
  status: string;
  message: string;
  data: {
    /** Opaque handle the extracted rows are then read back by. */
    fileRef: string;
    /** Presigned S3 URL the file is PUT to directly, bypassing our API. */
    upload_url: string;
    /** Echoed back onto the S3 PUT as x-amz-meta-* headers. */
    metaData: { maxSize: string; fileType: string };
  };
}

/** One row as the backend parsed it out of the sheet. Same field names as
 *  SkuApiItem minus the identity fields, since nothing is persisted yet. */
export interface ExtractedSkuRow {
  name: string;
  type: SkuApiType | null;
  hsnSac: string;
  unitPrice: string;
  costPrice: string | null;
  currency: string | null;
  description: string;
}

export interface SkuExtractedRowsResponse {
  status: string;
  message: string;
  data: { rows: ExtractedSkuRow[] };
}

/** Why one row didn't make it in. `row` is the sheet's own 1-based row number,
 *  so the merchant can go and fix that line. */
export interface SkuSkippedItem {
  row: number;
  reason: string;
}

export interface SkuImportCountResponse {
  status: string;
  message: string;
  data: {
    importedCount: number;
    skippedCount: number;
    skipped: SkuSkippedItem[];
  };
}

// ── Merchant currencies ─────────────────────────────────────────────────────

/** One currency the merchant is configured for. Mirror of pg-dashboard's
 *  CurrencyData (create-mca-payment-invoice/types.ts). */
export interface McaCurrency {
  bankId: string;
  countryName: string;
  currencyCode: string;
  currencyName: string;
  currencySymbol: string;
  iso2CountryCode: string;
}

/**
 * Two buckets, and a code can appear in both — local receiving accounts and the
 * global rail. pg-dashboard concatenates local then global and keeps the first
 * occurrence of each code, which is what useMcaCurrencies reproduces.
 */
export interface McaCurrencyListResponse {
  status: string;
  message: string;
  data: {
    global_currency: McaCurrency[];
    local_currency: McaCurrency[];
  };
}
