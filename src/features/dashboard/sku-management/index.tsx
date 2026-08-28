"use client";

import { useState } from "react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  PageHeader,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon/registry";
import { SelectMidView } from "@/components/common/SelectMidView";
import { SkuTable } from "@/features/dashboard/sku-management/components/SkuTable";
import { ImportSkuFileModal } from "@/features/dashboard/sku-management/components/ImportSkuFileModal";
import { GuideLauncher } from "@/components/common/guide/GuideLauncher";
import { SKU_GUIDE_KEY, SKU_GUIDE_STEPS } from "@/features/dashboard/sku-management/guide";
import { useSkuMidScope, useSkuPathMid } from "@/features/dashboard/sku-management/hooks";

/**
 * One header action, in whichever form the merchant's account shape calls for.
 *
 * With a single PACB MID (or one already selected) it is a plain button that
 * acts. With several and none selected, the same action first has to be told
 * which account it applies to, so it becomes a dropdown of MIDs and the pick is
 * what runs it. pg-dashboard does this with its ChooseMidSelect; the branch is
 * here rather than at each call site so the two forms can't drift apart.
 */
function MidScopedAction({
  label,
  icon,
  variant,
  needsMidChoice,
  midOptions,
  onRun,
}: {
  label: string;
  icon: IconName;
  variant: "primary" | "ghost";
  needsMidChoice: boolean;
  midOptions: string[];
  /** Called with the chosen MID, or "" when there was nothing to choose. */
  onRun: (mid: string) => void;
}) {
  const glyph = <Icon name={icon} className="h-3.5 w-3.5" />;

  if (!needsMidChoice) {
    return (
      <Button type="button" variant={variant} size="sm" leftIcon={glyph} onClick={() => onRun("")}>
        {label}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant={variant} size="sm" leftIcon={glyph}>
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Which merchant ID?</DropdownMenuLabel>
        {midOptions.map((mid) => (
          <DropdownMenuItem key={mid} onSelect={() => onRun(mid)} className="tabular-nums">
            {mid}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
  const { needsMidChoice, midOptions, selectMid } = useSkuMidScope();

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
