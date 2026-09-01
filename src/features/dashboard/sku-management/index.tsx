"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui";
import { MidScopedAction } from "@/components/common/MidScopedAction";
import { SelectMidView } from "@/components/common/SelectMidView";
import { SkuTable } from "@/features/dashboard/sku-management/components/SkuTable";
import { ImportSkuFileModal } from "@/features/dashboard/sku-management/components/ImportSkuFileModal";
import { GuideLauncher } from "@/components/common/guide/GuideLauncher";
import { SKU_GUIDE_KEY, SKU_GUIDE_STEPS } from "@/features/dashboard/sku-management/guide";
import { useSkuPathMid } from "@/features/dashboard/sku-management/hooks";
import { usePacbMidScope } from "@/lib/hooks/usePacbMidScope";

export function SkuManagementFeature() {
  // The buttons live here but every row they create lives in SkuTable, so this
  // shared parent holds the open state and the table owns the forms themselves.
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  // Which MID an import was scoped to, when the merchant had to pick. Kept
  // separate from the page's selected MID: choosing where to import to should
  // not silently re-scope the catalogue the merchant is looking at.
  const [importMid, setImportMid] = useState("");

  // The catalogue addresses one MID in the request path, so a merchant sitting
  // on a Card Payments MID has no catalogue to show — same guard pg-dashboard
  // applies here (`isPaMidSelected` → SelectMidView), expressed through
  // useResolvedMids' guardState.
  const { guardState } = useSkuPathMid();
  const { needsMidChoice, midOptions, selectMid } = usePacbMidScope();

  const openImport = (mid: string) => {
    setImportMid(mid);
    setImportOpen(true);
  };

  const openAddItem = (mid: string) => {
    // Add item does re-scope the page, because the row it creates belongs to
    // that MID and the merchant should end up looking at the list containing it.
    if (mid) selectMid(mid);
    setAddItemOpen(true);
  };

  if (guardState === "not-applicable") {
    return (
      <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
        <PageHeader title="SKU management" />
        <SelectMidView midType="PACB" />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      <PageHeader
        title="SKU management"
        actions={
          <>
            <MidScopedAction
              label="Import"
              icon="upload"
              variant="ghost"
              needsMidChoice={needsMidChoice}
              midOptions={midOptions}
              onRun={openImport}
            />
            <MidScopedAction
              label="Add item"
              icon="plus"
              variant="primary"
              needsMidChoice={needsMidChoice}
              midOptions={midOptions}
              onRun={openAddItem}
            />
          </>
        }
      />

      <SkuTable
        addItemOpen={addItemOpen}
        onAddItemOpenChange={setAddItemOpen}
        // The first-run empty state offers Import as a second way in. It never
        // needs a MID pick: an empty catalogue means the page already resolved
        // to one account's worth of nothing.
        onImport={() => openImport("")}
      />

      <ImportSkuFileModal open={importOpen} onOpenChange={setImportOpen} mid={importMid} />

      {/* First-visit onboarding coach-mark — add images to SKUs. */}
      <GuideLauncher steps={SKU_GUIDE_STEPS} storageKey={SKU_GUIDE_KEY} />
    </div>
  );
}
