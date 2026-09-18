import { type Metadata } from "next";
import { McaSettlementReportFeature } from "@/features/dashboard/mca-settlement-report";

export const metadata: Metadata = {
  title: "MCA Settlement Reports",
};

export default function McaSettlementReportPage() {
  return <McaSettlementReportFeature />;
}
