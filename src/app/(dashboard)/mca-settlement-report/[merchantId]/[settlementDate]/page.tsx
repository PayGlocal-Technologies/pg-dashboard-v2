import { type Metadata } from "next";
import { McaSettlementDetailFeature } from "@/features/dashboard/mca-settlement-report/components/SettlementDetailFeature";

export const metadata: Metadata = {
  title: "MCA Settlement Details",
};

interface McaSettlementDetailPageProps {
  params: Promise<{ merchantId: string; settlementDate: string }>;
}

// Both halves of the key are path segments, mirroring the endpoint this page
// reads (`/analytics/{merchantId}/merchant/settlement-detail?settlementDate=`).
// The merchant is not optional: an account settles at most once a day, but a
// UCIC-scoped list spans MIDs, so the date alone does not identify a settlement
// there — and a segment, unlike a query parameter, cannot be lost from a link.
export default async function McaSettlementDetailPage({ params }: McaSettlementDetailPageProps) {
  const { merchantId, settlementDate } = await params;
  return <McaSettlementDetailFeature merchantId={merchantId} settlementDate={settlementDate} />;
}
