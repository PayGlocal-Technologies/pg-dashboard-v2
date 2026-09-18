import { Suspense } from "react";
import { type Metadata } from "next";
import { SettlementReportsFeature } from "@/features/dashboard/settlement-reports";

export const metadata: Metadata = {
  title: "Settlement Reports",
};

// Fixed to PA: this is the path the Home and Payments nav trees link to.
// MCA has its own /mca-settlement-report.
export default function SettlementReportPage() {
  // Suspense boundary: the table below reads the header search's ?q= handoff
  // via useSearchParams, which Next requires be wrapped so the page can still
  // be statically prerendered.
  return (
    <Suspense>
      <SettlementReportsFeature product="PA" />
    </Suspense>
  );
}
