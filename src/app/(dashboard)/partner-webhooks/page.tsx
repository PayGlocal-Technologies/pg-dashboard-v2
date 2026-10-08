import { type Metadata } from "next";
import { PartnerWebhooksFeature } from "@/features/dashboard/partner-webhooks";

export const metadata: Metadata = { title: "Webhooks" };

/** Partners → Webhooks (DESIGN MOCK, see partner-webhooks/mock-data.ts). */
export default function PartnerWebhooksPage() {
  return <PartnerWebhooksFeature />;
}
