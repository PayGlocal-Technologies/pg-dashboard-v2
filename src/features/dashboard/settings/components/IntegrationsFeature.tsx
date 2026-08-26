"use client";

import { toast } from "sonner";
import { Button, Card, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";

export function IntegrationsFeature() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Integrations"
        subtitle="Connect PayGlocal with the tools you already use."
      />

      <Card className="flex-row items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name="puzzle" size={18} />
          </span>
          <div>
            <h2 className="text-base font-bold text-foreground">Zoho Books</h2>
            <p className="text-sm text-muted-foreground">
              Sync settlements and invoices with your Zoho Books account.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            toast.message("Integrate with Zoho Books", {
              description: "This action isn't wired up yet.",
            })
          }
        >
          Integrate
        </Button>
      </Card>
    </div>
  );
}
