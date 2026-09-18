import { type Metadata } from "next";
import { McaDashboardFeature } from "@/features/dashboard/mca-home";

export const metadata: Metadata = {
  title: "Multi-Currency Accounts Dashboard",
};

export default function McaDashboardPage() {
  return <McaDashboardFeature />;
}
