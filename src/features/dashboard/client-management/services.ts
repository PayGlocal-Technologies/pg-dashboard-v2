import { BASE_URL_V1, BASE_URL_V3 } from "@/api";

// Endpoint URL builders only — no axios, no fetch, no react-query. Every path
// below is copied verbatim from pg-dashboard (src/features/mca-clients/
// services.ts, plus mca-client-details/services.ts for the invoice summary),
// which is the production source of truth for these contracts.
//
// Like the SKU catalogue and unlike the OpenSearch transaction endpoints, every
// one of these takes the merchant id as a *path* segment for every user, not as
// a body filter for merchants and a path segment for partners. See
// useClientPathMid in hooks.ts for how that one id is resolved.
//
// The `mid &&` / `id &&` guards are the one deliberate difference from
// pg-dashboard, which interpolates unconditionally. A missing id there builds
// `/mca-client//search`, which still reaches the backend; returning "" here means
// a disabled query cannot construct a malformed URL in the first place.

const CLIENT_BASE = `${BASE_URL_V3}/mca-client`;

/** Client list search. A POST, but a read — see useClients' usePostQuery. */
export const clientSearchApi = (mid: string) => (mid ? `${CLIENT_BASE}/${mid}/search` : "");

/** One client in full. The list row is a subset of this, so the details view
 *  refetches rather than trusting what the table happened to have. */
export const clientByIdApi = (mid: string, id: string) =>
  mid && id ? `${CLIENT_BASE}/${mid}/${id}` : "";

/** POST a new client. Returns `{ data: { clientId } }`. */
export const clientCreateApi = (mid: string) => (mid ? `${CLIENT_BASE}/${mid}/create` : "");

/** PUT the full client body over one record. */
export const clientUpdateApi = (mid: string, id: string) =>
  mid && id ? `${CLIENT_BASE}/${mid}/${id}/update` : "";

// ── Contract document ───────────────────────────────────────────────────────
// Upload is two legs, as elsewhere in the product: ask our API for a presigned
// S3 PUT, then PUT the bytes straight to S3. View is a third call returning a
// presigned GET, so a stored contract is never a URL we hold on to.

/** Leg 1 of upload: `{ [fileName]: presignedUrl, metaData: { gid } }`. */
export const clientContractUploadApi = (mid: string, id: string) =>
  mid && id ? `${CLIENT_BASE}/${mid}/${id}/upload-contract` : "";

/** Removes the stored contract. PUT with no body. */
export const clientContractDeleteApi = (mid: string, id: string) =>
  mid && id ? `${CLIENT_BASE}/${mid}/${id}/delete-contract` : "";

/** POST returning `{ data: { url } }` — a presigned GET, opened in a new tab. */
export const clientContractViewApi = (mid: string, id: string) =>
  mid && id ? `${CLIENT_BASE}/${mid}/${id}/view-contract` : "";

// ── Reference data ──────────────────────────────────────────────────────────
// All three are merchant- or app-level configuration rather than static lists,
// which is why they are fetched. Note the tag endpoint is /mca-tag, not
// /mca-client, and that the state and country ones take no merchant id at all.

/** Tags already in use for clients, for the Add/Edit form's tag suggestions.
 *  `CLIENT` is the tag scope, part of the path. */
export const clientTagOptionsApi = (mid: string) =>
  mid ? `${BASE_URL_V3}/mca-tag/${mid}/CLIENT` : "";

/** `{ stateCodes: Record<stateName, code> }`. Indian states only — every other
 *  country collapses to the single "OTHER COUNTRY" entry, which is how
 *  pg-dashboard's form treats a non-India address. */
export const clientStateCodesApi = `${CLIENT_BASE}/get-state-details`;

/** `{ countryCodes: Record<countryName, iso2> }` — name to code, which is the
 *  direction the flag treatment needs (pg-dashboard builds the same flag URL
 *  from it). This is the only source of a client's ISO2: the client record
 *  itself carries only the country's display name. */
export const clientCountryCodesApi = `${CLIENT_BASE}/get-country-details`;

// ── Invoice summary ─────────────────────────────────────────────────────────

/** Per-client invoice counts for the details view's KPI row. Lives under
 *  /mca-invoice, not /mca-client, and takes the client as a query parameter.
 *  Verbatim from pg-dashboard (mca-client-details/services.ts). */
export const clientInvoiceSummaryApi = (mid: string, clientId: string) =>
  mid && clientId
    ? `${BASE_URL_V3}/mca-invoice/${mid}/get-invoice-summary?clientId=${encodeURIComponent(clientId)}`
    : "";

// ── Client invoice ledger ───────────────────────────────────────────────────
// The client details view's invoice list. These live under /mca-invoice and
// belong to pg-dashboard's mca-invoices feature; only the four the ledger
// actually uses are ported (its row actions and its own search).

/** The invoice search, filtered to one client through `fieldSearch.clientId`.
 *  Verbatim from pg-dashboard (mca-invoices/services.ts, createAllInvoicesApi). */
export const clientInvoiceSearchApi = (mid: string) =>
  mid ? `${BASE_URL_V3}/mca-invoice/${mid}/search` : "";

export const invoiceDuplicateApi = (mid: string, invoiceId: string) =>
  mid && invoiceId ? `${BASE_URL_V3}/mca-invoice/${mid}/${invoiceId}/duplicate-invoice` : "";

export const invoiceDeleteApi = (mid: string, invoiceId: string) =>
  mid && invoiceId ? `${BASE_URL_V3}/mca-invoice/${mid}/${invoiceId}/delete` : "";

/** Presigned GET for the invoice PDF. pg-dashboard writes this path inline in
 *  the row-action handler rather than in its services file — it is reproduced
 *  here as a builder so there is one place it can be checked. */
export const invoiceViewApi = (mid: string, invoiceId: string) =>
  mid && invoiceId ? `${BASE_URL_V3}/mca-invoice/${mid}/${invoiceId}/view-invoice` : "";

// ── Zoho integration ────────────────────────────────────────────────────────
// The client list offers a pull-sync when the merchant has connected Zoho.
// `identifier` is the merchant id. Verbatim from pg-dashboard
// (zoho-integration/service.ts) — note these are v1, not v3.

const ZOHO_BASE = (identifier: string) => `${BASE_URL_V1}/integrations/zoho/${identifier}`;

/** `{ status: "CONNECTED" | … }` — whether the sync action should appear at all. */
export const zohoStatusApi = (identifier: string) =>
  identifier ? `${ZOHO_BASE(identifier)}/status` : "";

/** Pulls clients (and/or invoices) across from the connected Zoho account. */
export const zohoPullSyncApi = (identifier: string) =>
  identifier ? `${ZOHO_BASE(identifier)}/pull-sync` : "";

// ── Not ported ──────────────────────────────────────────────────────────────
// pg-dashboard also exports `deleteMcaClient` (POST /mca-client/{mid}/delete),
// but nothing in production calls it — it is dead there too, and v2 has no
// delete affordance. Deliberately left out rather than wired against an
// unexercised contract.
