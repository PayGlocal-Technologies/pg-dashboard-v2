import { Suspense } from "react";
import { type Metadata } from "next";
import { MerchantPortfolioFeature } from "@/features/dashboard/merchant-portfolio";

export const metadata: Metadata = {
  title: "Merchant Portfolio",
};

export default function MerchantPortfolioPage() {
  return (
    <Suspense>
      <MerchantPortfolioFeature />
    </Suspense>
  );
}
