import type { HbsptTrackingData } from "@/features/auth/types";

interface UtmParams {
  campaignName: string | null;
  campaignSource: string | null;
  campaignMedium: string | null;
  campaignId: string | null;
}

function extractUtmParams(queryString: string): UtmParams {
  const params = new URLSearchParams(queryString);
  return {
    campaignName: params.get("utm_campaign"),
    campaignSource: params.get("utm_source"),
    campaignMedium: params.get("utm_medium"),
    campaignId: params.get("utm_id"),
  };
}

/**
 *
 * @param campaignDetails  Raw query-string (from cookie or URL search params)
 * @param influencerId     Influencer/deal code read from the influencerId cookie or URL path
 * @param websiteReferrer  Optional explicit referrer override
 */
export function getTrackingData(
  campaignDetails: string | null,
  influencerId: string,
  websiteReferrer?: string
): { hbsptTrackingData: HbsptTrackingData; src: string | null } {
  const utmParams = extractUtmParams(campaignDetails ?? "");

  const hbsptTrackingData: HbsptTrackingData = {
    ...utmParams,
    dateOfEngagementMilli: campaignDetails ? Date.now() : null,
    influencerId: influencerId || null,
    referrer: websiteReferrer ?? null,
  };

  const referrer = typeof window !== "undefined" ? (window.document?.referrer ?? "") : "";
  const pathname = typeof window !== "undefined" ? (window.location?.pathname ?? "") : "";

  const sourceMap: Record<string, string[]> = {
    AMZ: ["marketplace.payglocal.", "marketplace.dev.payglocal."],
    FREELANCER: ["freelancer.payglocal.", "freelancer.dev.payglocal."],
    MCA: ["mca.payglocal.", "mca.dev.payglocal."],
  };

  let src: string | null = null;

  if (pathname.includes("/amz")) {
    src = "AMZ";
  } else {
    for (const [key, domains] of Object.entries(sourceMap)) {
      if (domains.some((domain) => referrer.includes(domain))) {
        src = key;
        break;
      }
    }
  }

  return { hbsptTrackingData, src };
}
