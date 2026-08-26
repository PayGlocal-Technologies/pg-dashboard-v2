import { type Metadata } from "next";
import { IntegrationsFeature } from "@/features/dashboard/settings/components/IntegrationsFeature";

export const metadata: Metadata = { title: "Integrations" };

export default function IntegrationsPage() {
  return <IntegrationsFeature />;
}
