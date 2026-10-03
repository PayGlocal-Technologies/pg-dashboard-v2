import { type Metadata } from "next";
import { PartnerPricingFeature } from "@/features/dashboard/partner-pricing";

export const metadata: Metadata = {
  title: "Pricing",
};

export default function PricingPage() {
  return <PartnerPricingFeature />;
}
