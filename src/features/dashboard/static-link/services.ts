import { BASE_URL_V3 } from "@/api";

// Endpoint URL builders only. Ported verbatim from pg-dashboard's
// src/features/static-link/services.ts.
//
// Static Link has no controller of its own: every call goes through the shared
// no-code product controller (the one Payment Page uses), with the product type
// in the path. The old `/gcc/v1/merchants/{mid}/static-link*` routes are gone.

const staticLinkProductApi = (merchantId: string, productId: string): string =>
  `${BASE_URL_V3}/no-code/${merchantId}/STATIC_LINK/${productId}`;

/**
 * The link itself: GET → `data.productData`, including the server-issued
 * `shareableLink`. 404s while the link is still a DRAFT (see useStaticLink).
 */
export const staticLinkApi = staticLinkProductApi;

/**
 * Merchant self-service fields: PUT `{ displayFields }`, merged by `fieldKey`,
 * so only the fields being changed are sent.
 */
export const staticLinkConfigApi = (merchantId: string, productId: string): string =>
  `${staticLinkProductApi(merchantId, productId)}/config`;

/**
 * The merchant's own on/off switch: PUT `{ enabled, handle? }`, flipping the
 * link between LIVE and DISABLED. Also the one call that may carry a custom
 * handle (the first activation), which renames the link.
 */
export const staticLinkStatusApi = (merchantId: string, productId: string): string =>
  `${staticLinkProductApi(merchantId, productId)}/status`;

/**
 * Finds the merchant's link: POST TableReqBody with `fieldSearch.mid`. The
 * entry point for the whole screen, since every other call is addressed by a
 * `productId` that is server-generated and cannot be derived.
 */
export const staticLinkSearchApi = (merchantId: string): string =>
  `${BASE_URL_V3}/no-code/${merchantId}/STATIC_LINK/search`;
