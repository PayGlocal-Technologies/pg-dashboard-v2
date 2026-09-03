import { Suspense } from "react";
import { type Metadata } from "next";
import { SettlementReportsFeature } from "@/features/dashboard/settlement-reports";

export const metadata: Metadata = {
  title: "MCA Settlement Reports",
};

// Same feature as /settlement-report, fixed to PACB so this page always calls
// the FFMS settlement endpoints.
export default function McaSettlementReportPage() {
  // Suspense boundary: the table below reads the header search's ?q= handoff
  // via useSearchParams, which Next requires be wrapped so the page can still
  // be statically prerendered.
  return (
    <Suspense>
      <SettlementReportsFeature product="PACB" />
    </Suspense>
  );
}
