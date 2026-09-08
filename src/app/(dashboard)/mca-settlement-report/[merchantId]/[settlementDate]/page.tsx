import { type Metadata } from "next";
import { SettlementDetailFeature } from "@/features/dashboard/settlement-reports/components/SettlementDetailFeature";

export const metadata: Metadata = {
  title: "MCA Settlement Details",
};

interface McaSettlementDetailPageProps {
  params: Promise<{ merchantId: string; settlementDate: string }>;
}

// The MCA-route twin of /settlement-report/[merchantId]/[settlementDate], so
// drilling into a row from the MCA list keeps the merchant on the MCA path.
export default async function McaSettlementDetailPage({ params }: McaSettlementDetailPageProps) {
  const { merchantId, settlementDate } = await params;
  return (
    <SettlementDetailFeature
      merchantId={merchantId}
      settlementDate={settlementDate}
      product="PACB"
    />
  );
}
