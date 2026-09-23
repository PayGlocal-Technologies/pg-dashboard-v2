import { Suspense } from "react";
import { type Metadata } from "next";
import { PaymentButtonDetailFeature } from "@/features/dashboard/payment-button/components/PaymentButtonDetailFeature";

export const metadata: Metadata = {
  title: "Payment Button Details",
};

interface PaymentButtonDetailPageProps {
  params: Promise<{ buttonId: string }>;
}

// Suspense because the linked-transactions table reads ?q= via useSearchParams.
export default async function PaymentButtonDetailPage({ params }: PaymentButtonDetailPageProps) {
  const { buttonId } = await params;
  return (
    <Suspense>
      <PaymentButtonDetailFeature buttonId={decodeURIComponent(buttonId)} />
    </Suspense>
  );
}
