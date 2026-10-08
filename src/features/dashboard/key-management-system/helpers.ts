import { KEY_STATUS_META } from "@/features/dashboard/key-management-system/constants";
import type { KeyPathSegment } from "@/features/dashboard/key-management-system/services";
import type { KeyKind } from "@/features/dashboard/key-management-system/types";

/**
 * Who pg-dashboard's KMS treats as a partner: resellers, aggregators, and
 * partner-onboarded merchants. Wider than the app-wide isPartnerUser (no
 * aggregators there), so this page keeps its own test.
 */
export function isKmsPartner(
  profile: { role?: string; onboardingType?: string | null } | null | undefined
) {
  return (
    profile?.role === "RESELLER_ADMIN" ||
    profile?.role === "AGGREGATOR_ADMIN" ||
    profile?.onboardingType === "PARTNER"
  );
}

/** A kind's path segment: camelCase for IAM, kebab-case for partner routes. */
export function keyPathSegment(
  kind: Exclude<KeyKind, "certificate">,
  isPartner: boolean
): KeyPathSegment {
  if (kind === "rsa") return isPartner ? "rsa-key" : "rsa";
  return isPartner ? "api-key" : "apiKey";
}

/** The filename a download response names in Content-Disposition, if any. */
export function fileNameFromDisposition(header: string | undefined, fallback: string): string {
  const match = header?.match(/filename\*?=['"]?(?:UTF-8'')?([^;"']+)/i);
  return match?.[1] ? decodeURIComponent(match[1]) : fallback;
}

export function getKeyStatusMeta(status: string | null | undefined) {
  return (
    KEY_STATUS_META[(status ?? "").toUpperCase()] ?? {
      label: status ? status.charAt(0) + status.slice(1).toLowerCase() : "—",
      variant: "muted" as const,
    }
  );
}
