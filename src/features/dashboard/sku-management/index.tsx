"use client";

import { Button, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { SkuTable } from "@/features/dashboard/sku-management/components/SkuTable";

export function SkuManagementFeature() {
  // TODO: wire both up once the catalogue endpoints exist — "Add item" should
  // open a create-product form and "Import" a bulk CSV upload. Same gap as the
  // Transactions page's own Report button.
  const handleAddItem = () => {};
  const handleImport = () => {};

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      <PageHeader
        title="SKU management"
        actions={
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              leftIcon={<Icon name="upload" className="h-3.5 w-3.5" />}
              onClick={handleImport}
            >
              Import
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
              onClick={handleAddItem}
            >
              Add item
            </Button>
          </>
        }
      />

      <SkuTable />
    </div>
  );
}
