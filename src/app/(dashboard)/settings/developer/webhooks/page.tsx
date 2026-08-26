import { type Metadata } from "next";
import { WebhooksFeature } from "@/features/dashboard/settings/components/WebhooksFeature";

export const metadata: Metadata = { title: "Webhooks" };

export default function WebhooksPage() {
  return <WebhooksFeature />;
}
