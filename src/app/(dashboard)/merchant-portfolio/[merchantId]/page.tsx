import { Suspense } from "react";
import { type Metadata } from "next";
import { PortfolioDetailRoute } from "@/features/dashboard/merchant-portfolio/components/PortfolioDetailPage";

export const metadata: Metadata = {
  title: "Merchant",
};

interface PortfolioMerchantPageProps {
  params: Promise<{ merchantId: string }>;
}

export default async function PortfolioMerchantPage({ params }: PortfolioMerchantPageProps) {
  const { merchantId } = await params;
  return (
    <Suspense>
      <PortfolioDetailRoute merchantId={decodeURIComponent(merchantId)} />
    </Suspense>
  );
}
