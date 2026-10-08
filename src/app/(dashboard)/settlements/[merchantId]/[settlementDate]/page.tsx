import { type Metadata } from "next";
import { SettlementDetailFeature } from "@/features/dashboard/settlement-reports/components/SettlementDetailFeature";

export const metadata: Metadata = {
  title: "Settlement Details",
};

interface SettlementDetailPageProps {
  params: Promise<{ merchantId: string; settlementDate: string }>;
}

// Both halves of the key are path segments, mirroring the endpoint this page
// reads (`/analytics/{merchantId}/merchant/settlement-detail?settlementDate=`).
// The merchant is not optional: an account settles at most once a day, but a
// UCIC-scoped list spans MIDs, so the date alone does not identify a settlement
// there — and a segment, unlike a query parameter, cannot be lost from a
// bookmarked or shared link.
export default async function SettlementDetailPage({ params }: SettlementDetailPageProps) {
  const { merchantId, settlementDate } = await params;
  return (
    <SettlementDetailFeature merchantId={merchantId} settlementDate={settlementDate} product="PA" />
  );
}
