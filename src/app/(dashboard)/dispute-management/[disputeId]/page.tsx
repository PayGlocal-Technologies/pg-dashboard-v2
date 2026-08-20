import { type Metadata } from "next";
import { TransactionDetailFeature } from "@/features/dashboard/transactions/components/TransactionDetailFeature";

export const metadata: Metadata = {
  title: "Dispute Details",
};

interface DisputeDetailPageProps {
  params: Promise<{ disputeId: string }>;
}

export default async function DisputeDetailPage({ params }: DisputeDetailPageProps) {
  const { disputeId } = await params;
  return (
    <TransactionDetailFeature
      transactionId={decodeURIComponent(disputeId)}
      origin="dispute-management"
    />
  );
}
