import { BASE_URL_V3 } from "@/api";

// Endpoint URL builders only. Copied verbatim from pg-dashboard, where this
// path is written inline in RequestPlatformForm.tsx rather than in a services
// file.

/** Tells PayGlocal about a platform the merchant uses that isn't supported yet. */
export const requestPlatformApi = `${BASE_URL_V3}/request/platform`;
