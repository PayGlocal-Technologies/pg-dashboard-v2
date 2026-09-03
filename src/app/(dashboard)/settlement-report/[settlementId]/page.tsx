import { type Metadata } from "next";
import { SettlementDetailFeature } from "@/features/dashboard/settlement-reports/components/SettlementDetailFeature";

export const metadata: Metadata = {
  title: "Settlement Details",
};

interface SettlementDetailPageProps {
  params: Promise<{ settlementId: string }>;
}

export default async function SettlementDetailPage({ params }: SettlementDetailPageProps) {
  const { settlementId } = await params;
  return <SettlementDetailFeature settlementId={settlementId} product="PA" />;
}
