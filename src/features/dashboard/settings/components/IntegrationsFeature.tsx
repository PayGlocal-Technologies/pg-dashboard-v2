"use client";

import { PageHeader } from "@/components/ui";
import { ZohoIntegrationCard } from "@/features/dashboard/zoho-integration";

export function IntegrationsFeature() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Integrations"
        subtitle="Connect PayGlocal with the tools you already use."
      />

      {/* Zoho lives in its own feature (the fuller port — connect/disconnect/
          sync dialogs, permission gate, multi-MID sync). The card renders
          nothing without the getZohoConnectionStatus permission. */}
      <div className="max-w-sm">
        <ZohoIntegrationCard />
      </div>
    </div>
  );
}
