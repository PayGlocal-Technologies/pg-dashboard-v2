import { type Metadata } from "next";
import { SettlementReportsFeature } from "@/features/dashboard/settlement-reports";

export const metadata: Metadata = {
  title: "MCA Settlement Reports",
};

// Same feature as /settlement-report: it picks the MCA dataset off the active
// context, this route just gives the MCA nav tree a path of its own.
export default function McaSettlementReportPage() {
  return <SettlementReportsFeature />;
}
