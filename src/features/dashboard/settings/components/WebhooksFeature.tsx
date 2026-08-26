"use client";

import { toast } from "sonner";
import { Badge, Button, Card, PageHeader, StatusBadge } from "@/components/ui";
import { BackendGapNotice } from "@/features/dashboard/settings/components/BackendGapNotice";

interface WebhookEndpoint {
  id: string;
  url: string;
  status: "active" | "inactive";
  events: string[];
}

// TODO(integration): no webhook-management endpoint exists yet, this is
// illustrative-only mock data.
const MOCK_ENDPOINTS: WebhookEndpoint[] = [
  {
    id: "wh-1",
    url: "https://api.mcatest123.com/webhooks/payglocal",
    status: "active",
    events: ["payment.success", "payment.failed", "settlement.created", "dispute.opened"],
  },
];

function notWiredUp(action: string) {
  toast.message(action, { description: "This action isn't wired up yet." });
}

export function WebhooksFeature() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Webhooks"
        subtitle="Endpoints that receive event payloads from PayGlocal."
        actions={
          <Button variant="primary" size="sm" onClick={() => notWiredUp("Add endpoint")}>
            Add endpoint
          </Button>
        }
      />

      <BackendGapNotice message="No webhook-management endpoint exists yet — endpoints and actions here are illustrative." />

      <Card className="gap-0 p-5">
        <div className="flex flex-col gap-3">
          {MOCK_ENDPOINTS.map((endpoint) => (
            <div key={endpoint.id} className="rounded-xl border border-border p-3.5">
              <div className="flex items-center justify-between gap-4">
                <p className="truncate font-mono text-sm text-foreground">{endpoint.url}</p>
                <div className="flex items-center gap-3">
                  <StatusBadge
                    variant={endpoint.status === "active" ? "success" : "muted"}
                    label={endpoint.status === "active" ? "Active" : "Inactive"}
                    size="sm"
                  />
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto min-h-0 p-0 text-sm font-medium"
                    onClick={() => notWiredUp("Edit endpoint")}
                  >
                    Edit
                  </Button>
                </div>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {endpoint.events.map((event) => (
                  <Badge key={event} variant="secondary" size="sm">
                    {event}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
