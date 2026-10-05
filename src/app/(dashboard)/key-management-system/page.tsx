import { type Metadata } from "next";
import { KeyManagementFeature } from "@/features/dashboard/key-management-system";

export const metadata: Metadata = {
  title: "Key Management",
};

export default function KeyManagementPage() {
  return <KeyManagementFeature />;
}
