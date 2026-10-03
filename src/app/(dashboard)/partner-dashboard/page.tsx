import { type Metadata } from "next";
import { PartnerDashboardFeature } from "@/features/dashboard/partner-home";

export const metadata: Metadata = {
  title: "Partner Dashboard",
};

export default function PartnerDashboardPage() {
  return <PartnerDashboardFeature />;
}
