import type { AppEnv } from "@/constants/environment";

/**
 * The host a static link lives on, per environment (UAT is on pygcl.com, see
 * constants/environment.ts). TODO(api): confirm the hosts with backend; only
 * prod's pay.payglocal.in is in the design.
 */
export const STATIC_LINK_HOST_BY_ENV: Record<AppEnv, string> = {
  dev: "pay.dev.payglocal.in",
  uat: "pay.uat.pygcl.com",
  prod: "pay.payglocal.in",
};

export const STATIC_LINK_TITLE = "A unique link for your business";
export const STATIC_LINK_SUBTITLE = "That you and your customers can remember";
export const STATIC_LINK_COPIED_MESSAGE = "Link copied";

/** Used when the merchant's name gives nothing to build a handle from. */
export const FALLBACK_HANDLE = "your-business";
