import { type Metadata } from "next";
import { SettlementReportsFeature } from "@/features/dashboard/settlement-reports";

export const metadata: Metadata = {
  title: "Settlement Reports",
};

export default function SettlementReportPage() {
  return <SettlementReportsFeature />;
}
