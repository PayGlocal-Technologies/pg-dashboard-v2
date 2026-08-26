import { Suspense } from "react";
import { type Metadata } from "next";
import { IntegrationsFeature } from "@/features/dashboard/settings/components/IntegrationsFeature";

export const metadata: Metadata = { title: "Integrations" };

export default function IntegrationsPage() {
  // Suspense boundary: IntegrationsFeature reads the OAuth callback query via
  // useSearchParams (see useZohoIntegration), which Next requires be wrapped so
  // the page can still be statically prerendered.
  return (
    <Suspense>
      <IntegrationsFeature />
    </Suspense>
  );
}
