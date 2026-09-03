import { type Metadata } from "next";
import { DisputeDetailFeature } from "@/features/dashboard/pa-transactions/components/DisputeDetailFeature";

export const metadata: Metadata = {
  title: "Dispute Details",
};

interface DisputeDetailPageProps {
  params: Promise<{ transactionId: string; disputeId: string }>;
}

export default async function DisputeDetailPage({ params }: DisputeDetailPageProps) {
  const { transactionId, disputeId } = await params;
  return (
    <DisputeDetailFeature
      transactionId={decodeURIComponent(transactionId)}
      disputeId={decodeURIComponent(disputeId)}
      origin="dispute-management"
    />
  );
}
