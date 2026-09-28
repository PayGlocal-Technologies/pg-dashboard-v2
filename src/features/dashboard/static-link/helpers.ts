import { getAppEnv } from "@/constants/environment";
import {
  FALLBACK_HANDLE,
  STATIC_LINK_HOST_BY_ENV,
} from "@/features/dashboard/static-link/constants";

/** "Acme Inc." to "acme-inc": the part of the link after the @. */
export function toHandle(name: string | null | undefined): string {
  const handle = (name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return handle || FALLBACK_HANDLE;
}

/** "pay.payglocal.in": this environment's static link host. */
export function staticLinkHost(): string {
  return STATIC_LINK_HOST_BY_ENV[getAppEnv()];
}

/** "pay.payglocal.in/@acme-inc", as shown and copied. */
export function staticLinkUrl(handle: string): string {
  return `${staticLinkHost()}/@${handle}`;
}
