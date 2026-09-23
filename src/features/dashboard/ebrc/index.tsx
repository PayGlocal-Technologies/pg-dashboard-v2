"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { EbrcBanner } from "@/features/dashboard/ebrc/components/EbrcBanner";

/**
 * eBRC's own promo — the parent nav item's landing page, one level above its
 * two real children (eBRC Status, IRM Repository). The banner itself
 * (EbrcBanner) is shared with the DGFT connect gate merchants hit if they
 * land on eBRC Status/Generation without connecting first.
 */
export function EbrcFeature() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <PageHeader
        title="eBRC"
        subtitle="Electronic Bank Realisation Certificates for your export receipts."
      />

      <EbrcBanner ctaLabel="Sign in to DGFT" onCtaClick={() => router.push("/ebrc-generation")} />
    </div>
  );
}
