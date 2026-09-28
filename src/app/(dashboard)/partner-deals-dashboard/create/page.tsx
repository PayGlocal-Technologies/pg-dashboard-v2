import { type Metadata } from "next";
import { CreateDealPage } from "@/features/dashboard/partner-deals/CreateDealPage";

export const metadata: Metadata = {
  title: "Create Deal",
};

export default function PartnerDealsCreatePage() {
  return <CreateDealPage />;
}
