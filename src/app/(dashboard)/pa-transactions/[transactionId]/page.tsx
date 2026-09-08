import { type Metadata } from "next";
import { TransactionDetailFeature } from "@/features/dashboard/pa-transactions/components/TransactionDetailFeature";

export const metadata: Metadata = {
  title: "Transaction Details",
};

interface TransactionDetailPageProps {
  params: Promise<{ transactionId: string }>;
}

export default async function TransactionDetailPage({ params }: TransactionDetailPageProps) {
  const { transactionId } = await params;
  return <TransactionDetailFeature transactionId={decodeURIComponent(transactionId)} />;
}
