import { type Metadata } from "next";
import { PartnerKeyManagementFeature } from "@/features/dashboard/partner-keys";

export const metadata: Metadata = { title: "Key Management" };

/** Partners → Key Management (DESIGN MOCK, see partner-keys/mock-data.ts). */
export default function PartnerKeyManagementPage() {
  return <PartnerKeyManagementFeature />;
}
