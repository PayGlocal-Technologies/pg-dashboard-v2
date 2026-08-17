"use client";

import { useState } from "react";
import { Button, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { SkuTable } from "@/features/dashboard/sku-management/components/SkuTable";

export function SkuManagementFeature() {
  // The button lives here but every row it creates lives in SkuTable, so this
  // shared parent holds the open state and the table owns the form itself.
  const [addItemOpen, setAddItemOpen] = useState(false);

  // TODO: wire up once a bulk-import endpoint exists — Import should accept a
  // CSV of items. Add item is a real flow now (see SkuItemFormModal).
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
              onClick={() => setAddItemOpen(true)}
            >
              Add item
            </Button>
          </>
        }
      />

      <SkuTable addItemOpen={addItemOpen} onAddItemOpenChange={setAddItemOpen} />
    </div>
  );
}
