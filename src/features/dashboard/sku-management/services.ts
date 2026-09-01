import { BASE_URL_V1, BASE_URL_V3 } from "@/api";

// Endpoint URL builders only — no axios, no fetch, no react-query. Every path
// below is copied verbatim from pg-dashboard
// (src/features/sku-management/services.ts), which is the production source of
// truth for these contracts.
//
// One thing to know before reading them: unlike the OpenSearch table endpoints
// (search/ffms/txn/{mid}), where the merchant id is a path segment for partner
// users and a body filter for everyone else, the catalogue endpoints take the
// merchant id in the *path* for every user. See useSkuPathMid in hooks.ts for
// how that one id is resolved.
//
// The `mid &&` / `id &&` guards are the one deliberate difference from
// pg-dashboard, which interpolates unconditionally. A missing id there produces
// `/sku//search`, which reaches the backend as a real request; returning "" here
// means a disabled query cannot construct a malformed URL in the first place.

const SKU_BASE = `${BASE_URL_V3}/sku`;

/** Catalogue search. A POST, but a read — see useSkuCatalogue's usePostQuery. */
export const skuSearchApi = (mid: string) => (mid ? `${SKU_BASE}/${mid}/search` : "");

/** POST a new catalogue item. Returns `{ data: { id } }`. */
export const skuCreateApi = (mid: string) => (mid ? `${SKU_BASE}/${mid}` : "");

/** PUT the full item body over one row. Same path as delete, different verb. */
export const skuUpdateApi = (mid: string, id: string) =>
  mid && id ? `${SKU_BASE}/${mid}/${id}` : "";

export const skuDeleteApi = (mid: string, id: string) =>
  mid && id ? `${SKU_BASE}/${mid}/${id}` : "";

/** Server-side copy of one item. Takes no body. */
export const skuDuplicateApi = (mid: string, id: string) =>
  mid && id ? `${SKU_BASE}/${mid}/${id}/duplicate` : "";

export const skuImageUploadApi = (mid: string, id: string) =>
  mid && id ? `${SKU_BASE}/${mid}/${id}/image` : "";

// ── Bulk import from a file ─────────────────────────────────────────────────
// Four legs, in the order the modal walks them: fetch the template so the
// merchant has the right columns, ask for somewhere to put their file, read back
// what the backend extracted from it, then commit those rows to the catalogue.

/** The blank xlsx merchants fill in. Merchant-agnostic — no mid. */
export const skuTemplateApi = () => `${SKU_BASE}/template`;

/** Asks for a presigned S3 PUT plus the `fileRef` the upload is keyed by. */
export const skuUploadInitiateApi = (mid: string) =>
  mid ? `${SKU_BASE}/${mid}/upload/initiate` : "";

/** Rows the backend parsed out of the uploaded file, for the review step. */
export const skuExtractedRowsApi = (mid: string, fileRef: string) =>
  mid && fileRef ? `${SKU_BASE}/${mid}/upload/${fileRef}/data` : "";

/** Commits the extracted rows. Returns imported/skipped counts and reasons. */
export const skuImportFileApi = (mid: string) => (mid ? `${SKU_BASE}/${mid}/import/file` : "");

/** The currencies this merchant can actually price in — merchant configuration,
 *  not a static list, which is why it is fetched. Verbatim from pg-dashboard
 *  (create-mca-payment-invoice/services.ts, `getMcaCurrenciesApi`). Note this
 *  one is v1, not v3 like the catalogue endpoints above. */
export const mcaCurrenciesApi = (mid: string) =>
  mid ? `${BASE_URL_V1}/merchants/${mid}/ffms/currencies` : "";

// ── Not ported ──────────────────────────────────────────────────────────────
// Import-from-history is deliberately out of scope for now (parity items A5/A6):
//
//   GET  /sku/{mid}/previous-items            items from this merchant's history
//   POST /sku/{mid}/import/previous-items     commit a selection of those
