import { type Metadata } from "next";
import { MerchantDetailRoute } from "@/features/dashboard/my-merchants/components/MerchantDetailRoute";

export const metadata: Metadata = {
  title: "Merchant",
};

interface MerchantDetailPageProps {
  params: Promise<{ onboardingId: string }>;
}

export default async function MerchantDetailPage({ params }: MerchantDetailPageProps) {
  const { onboardingId } = await params;
  return <MerchantDetailRoute onboardingId={decodeURIComponent(onboardingId)} />;
}
