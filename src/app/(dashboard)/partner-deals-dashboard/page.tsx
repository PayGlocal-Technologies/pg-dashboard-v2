import { type Metadata } from "next";
import { PartnerDealsFeature } from "@/features/dashboard/partner-deals";

export const metadata: Metadata = {
  title: "Partner Deals",
};

export default function PartnerDealsPage() {
  return <PartnerDealsFeature />;
}
