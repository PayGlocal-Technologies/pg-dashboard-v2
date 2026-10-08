"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui";
import { MidScopedAction } from "@/components/common/MidScopedAction";
import { SkuTable } from "@/features/dashboard/sku-management/components/SkuTable";
import { ImportSkuFileModal } from "@/features/dashboard/sku-management/components/ImportSkuFileModal";
import { GuideLauncher } from "@/components/common/guide/GuideLauncher";
import { SKU_GUIDE_KEY, SKU_GUIDE_STEPS } from "@/features/dashboard/sku-management/guide";
import { useSkuMidScope } from "@/features/dashboard/sku-management/hooks";
import { useUrlAction } from "@/lib/hooks/useUrlAction";

export function SkuManagementFeature() {
  // The buttons live here but every row they create lives in SkuTable, so this
  // shared parent holds the open state and the table owns the forms themselves.
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  // Which MID an import was scoped to, when the merchant had to pick. Kept
  // separate from the page's selected MID: choosing where to import to should
  // not silently re-scope the catalogue the merchant is looking at.
  const [importMid, setImportMid] = useState("");

  // The catalogue spans Card Payments (PA) and Global Fund Transfer (PACB)
  // MIDs alike. It used to be PACB-only, with a Card Payments selection shown a
  // "pick a Global Fund Transfer MID" screen instead (pg-dashboard's
  // `isPaMidSelected` → SelectMidView); that guard is gone with the scope.
  const { needsMidChoice, midOptions, selectMid } = useSkuMidScope();

  // "" means MidScopedAction had nothing to ask. With exactly one MID that is
  // the one, and it is named explicitly: a multi-MID account with nothing
  // selected otherwise resolves the path to its UCIC id, and a SKU has to be
  // created under a real MID.
  const resolveMid = (mid: string) => mid || (midOptions.length === 1 ? midOptions[0] : "");

  const openImport = (mid: string) => {
    setImportMid(resolveMid(mid));
    setImportOpen(true);
  };

  const openAddItem = (mid: string) => {
    // Add item does re-scope the page, because the row it creates belongs to
    // that MID and the merchant should end up looking at the list containing it.
    const target = resolveMid(mid);
    if (target) selectMid(target);
    setAddItemOpen(true);
  };

  // "Add item" and "Import items" picked from the header search land here as
  // ?action=add-item / ?action=import. Both call the same openers with "" that
  // the buttons call when there is no MID to choose (see MidScopedAction), so
  // the two entry points are one code path. Held back until the MID list has
  // loaded, and never fired while a choice is pending.
  const canRunUrlAction = midOptions.length > 0 && !needsMidChoice;
  useUrlAction("add-item", () => openAddItem(""), canRunUrlAction);
  useUrlAction("import", () => openImport(""), canRunUrlAction);

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      <PageHeader
        title="SKU management"
        actions={
          <>
            <MidScopedAction
              label="Import"
              icon="upload"
              variant="outline"
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
        // The first-run empty state's Add item and Import run the same openers
        // as the header, through the same MID question: an empty catalogue no
        // longer means a single account, now that it spans PA and PACB MIDs.
        onAddItem={openAddItem}
        onImport={openImport}
      />

      <ImportSkuFileModal open={importOpen} onOpenChange={setImportOpen} mid={importMid} />

      {/* First-visit onboarding coach-mark — add images to SKUs. */}
      <GuideLauncher steps={SKU_GUIDE_STEPS} storageKey={SKU_GUIDE_KEY} />
    </div>
  );
}
