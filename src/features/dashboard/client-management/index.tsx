"use client";

import { useState } from "react";
import { Button, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { ClientTable } from "@/features/dashboard/client-management/components/ClientTable";

export function ClientManagementFeature() {
  // The button lives here but every row it creates lives in ClientTable, so
  // this shared parent holds the open state and the table owns the form
  // itself — the same split the SKU page uses for Add item.
  const [addClientOpen, setAddClientOpen] = useState(false);

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      {/* PageHeader puts `actions` at the far right of the title row, so the
          primary CTA sits opposite the title at every width. */}
      <PageHeader
        title="Client management"
        actions={
          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
            onClick={() => setAddClientOpen(true)}
          >
            Add client
          </Button>
        }
      />

      <ClientTable addClientOpen={addClientOpen} onAddClientOpenChange={setAddClientOpen} />
    </div>
  );
}
