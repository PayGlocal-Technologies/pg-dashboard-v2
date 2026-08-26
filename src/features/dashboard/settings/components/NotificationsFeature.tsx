"use client";

import { useState } from "react";
import { Card, PageHeader, Switch } from "@/components/ui";
import { BackendGapNotice } from "@/features/dashboard/settings/components/BackendGapNotice";

interface NotificationSetting {
  key: string;
  label: string;
  description: string;
}

const NOTIFICATION_SETTINGS: NotificationSetting[] = [
  {
    key: "funding-received",
    label: "Funding received",
    description: "Get notified when settled funds arrive in your bank account.",
  },
  {
    key: "firc-received",
    label: "FIRC received",
    description: "Get notified when a Foreign Inward Remittance Certificate is issued.",
  },
  {
    key: "invoice-pending-alerts",
    label: "Invoice pending alerts",
    description: "Get notified about invoices awaiting action.",
  },
];

// TODO(integration): no notification-preferences endpoint exists yet,
// toggle state is local-only for this session.
export function NotificationsFeature() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    "funding-received": true,
    "firc-received": true,
    "invoice-pending-alerts": true,
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Notifications" subtitle="Choose what we notify you about." />

      <BackendGapNotice message="No notification-preferences endpoint exists yet — toggles change local state only for this session." />

      <Card className="gap-0 p-0">
        <div className="divide-y divide-border px-5">
          {NOTIFICATION_SETTINGS.map((setting) => (
            <div key={setting.key} className="flex items-center justify-between gap-4 py-3.5">
              <div>
                <p className="text-sm font-semibold text-foreground">{setting.label}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{setting.description}</p>
              </div>
              <Switch
                checked={enabled[setting.key] ?? false}
                onCheckedChange={(checked) =>
                  setEnabled((prev) => ({ ...prev, [setting.key]: checked }))
                }
                aria-label={setting.label}
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
