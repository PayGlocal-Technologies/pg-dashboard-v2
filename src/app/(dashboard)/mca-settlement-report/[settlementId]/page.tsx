import { type Metadata } from "next";
import { SettlementDetailFeature } from "@/features/dashboard/settlement-reports/components/SettlementDetailFeature";

export const metadata: Metadata = {
  title: "MCA Settlement Details",
};

interface McaSettlementDetailPageProps {
  params: Promise<{ settlementId: string }>;
}

// The MCA-route twin of /settlement-report/[settlementId], so drilling into a
// row from the MCA list keeps the merchant on the MCA path.
export default async function McaSettlementDetailPage({ params }: McaSettlementDetailPageProps) {
  const { settlementId } = await params;
  return <SettlementDetailFeature settlementId={settlementId} product="PACB" />;
}
