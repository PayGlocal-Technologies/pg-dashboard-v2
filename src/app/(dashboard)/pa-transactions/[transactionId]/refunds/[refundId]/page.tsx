import { type Metadata } from "next";
import { RefundDetailFeature } from "@/features/dashboard/pa-transactions/components/RefundDetailFeature";

export const metadata: Metadata = {
  title: "Refund Details",
};

interface RefundDetailPageProps {
  params: Promise<{ transactionId: string; refundId: string }>;
}

export default async function RefundDetailPage({ params }: RefundDetailPageProps) {
  const { transactionId, refundId } = await params;
  return (
    <RefundDetailFeature
      transactionId={decodeURIComponent(transactionId)}
      refundId={decodeURIComponent(refundId)}
    />
  );
}
