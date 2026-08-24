"use client";

import { PageHeader } from "@/components/ui";
import { ZohoIntegrationCard } from "@/features/dashboard/zoho-integration";

/**
 * Settings, at /settings.
 *
 * Currently only the Integrations section, which is where pg-dashboard keeps
 * the Zoho card too (My Account → Integrations). The rest of production's
 * account tabs (account, business, settlement, contact details) have no v2
 * equivalent yet, so the page is deliberately just this one section rather
 * than an empty tab strip.
 */
export function SettingsFeature() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-4 page-enter">
      <PageHeader title="Settings" subtitle="Manage your account, team and preferences." />

      <section className="space-y-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">
            Integrations
          </h2>
          <p className="text-[13px] text-muted-foreground">
            Connect the tools you already run your business on.
          </p>
        </div>

        {/* One card wide today; the grid is what lets the next integration
            slot in beside it without touching this file's layout. */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <ZohoIntegrationCard />
        </div>
      </section>
    </div>
  );
}
