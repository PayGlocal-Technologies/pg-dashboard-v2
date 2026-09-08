import { type Metadata } from "next";
import { DisputeManagementFeature } from "@/features/dashboard/dispute-management";

export const metadata: Metadata = {
  title: "Dispute Management",
};

export default function DisputeManagementPage() {
  return <DisputeManagementFeature />;
}
