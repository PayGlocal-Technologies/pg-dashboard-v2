"use client";

import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { useAccountSetup } from "@/stores/useAccountSetup";

export function NoFeatureView() {
  const setSelectedMidDetails = useAccountSetup((s) => s.setSelectedMidDetails);

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Icon name="building-2" size={24} className="text-muted-foreground" />
      </div>
      <div className="max-w-sm space-y-1">
        <h3 className="text-sm font-semibold text-foreground">
          This feature isn&apos;t available for the selected Merchant ID
        </h3>
        <p className="text-xs text-muted-foreground">
          You can switch to a different Merchant ID or go back to your Main View.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        rightIcon={<Icon name="arrow-right" className="w-3.5 h-3.5" />}
        onClick={() => setSelectedMidDetails({ mid: "", status: "", color: "" })}
      >
        Go to Main View
      </Button>
    </div>
  );
}
