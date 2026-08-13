"use client";

import { Button, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { ClientTable } from "@/features/dashboard/client-management/components/ClientTable";

export function ClientManagementFeature() {
  // TODO: open a create-client form once one exists. There is no client
  // endpoint wired up on this page yet (MOCK_CLIENTS stands in for one), so
  // this is deliberately inert rather than pointed at a half-built flow — the
  // same gap as the SKU page's "Add item" and the Transactions page's Report.
  const handleAddClient = () => {};

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
            onClick={handleAddClient}
          >
            Add client
          </Button>
        }
      />

      <ClientTable />
    </div>
  );
}
