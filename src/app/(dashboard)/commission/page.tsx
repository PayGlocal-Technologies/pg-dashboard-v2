import { type Metadata } from "next";
import { CommissionsFeature } from "@/features/dashboard/commissions";

export const metadata: Metadata = {
  title: "Commissions",
};

export default function CommissionPage() {
  return <CommissionsFeature />;
}
