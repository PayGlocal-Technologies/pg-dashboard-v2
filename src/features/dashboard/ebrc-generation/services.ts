import { BASE_URL_V3 } from "@/api";

/**
 * eBRC endpoints, verbatim from pg-dashboard
 * (src/features/ebrc-generation/service.ts).
 *
 * Every eBRC call is a POST whose body carries an `operationType` matching the
 * last path segment — the backend dispatches on both, so the two must agree.
 * See `hooks.ts`, where each hook sends its own operationType.
 */

/** Search endpoints, not MID-scoped in the path: the MID travels in the body's
 *  `fieldSearch.merchantId` instead. `operation` is "irm/search" or
 *  "ebrc/search". */
export const ebrcFetchApi = (operation: string): string => `${BASE_URL_V3}/ebrc/${operation}`;

/**
 * MID-scoped operations. Returns "" when the MID is missing so a disabled
 * query cannot construct `/ebrc//refresh_irm` — pg-dashboard guards this at
 * the call sites instead (`ebrcGenerationApi(mid || "", ...)`), which builds
 * exactly that malformed URL; guarding here is the v2 convention.
 */
export const ebrcGenerationApi = (mid: string, operation: string): string =>
  mid ? `${BASE_URL_V3}/ebrc/${mid}/${operation}` : "";
