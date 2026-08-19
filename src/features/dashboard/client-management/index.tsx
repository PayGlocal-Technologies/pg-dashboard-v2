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
import { ClientTable } from "@/features/dashboard/client-management/components/ClientTable";
import {
  useClientMidScope,
  useClientPathMid,
  useZohoClientSync,
} from "@/features/dashboard/client-management/hooks";

/**
 * One header action, in whichever form the merchant's account shape calls for.
 *
 * With a single PACB MID (or one already selected) it is a plain button that
 * acts. With several and none selected, the same action first has to be told
 * which account it applies to, so it becomes a dropdown of MIDs and the pick is
 * what runs it. pg-dashboard does this with its ChooseMidSelect; the branch lives
 * here rather than at each call site so the two forms can't drift apart.
 */
function MidScopedAction({
  label,
  icon,
  variant,
  isLoading,
  needsMidChoice,
  midOptions,
  onRun,
}: {
  label: string;
  icon: IconName;
  variant: "primary" | "ghost";
  isLoading?: boolean;
  needsMidChoice: boolean;
  midOptions: string[];
  /** Called with the chosen MID, or "" when there was nothing to choose. */
  onRun: (mid: string) => void;
}) {
  const glyph = <Icon name={icon} className="h-3.5 w-3.5" />;

  if (!needsMidChoice) {
    return (
      <Button
        type="button"
        variant={variant}
        size="sm"
        isLoading={isLoading}
        leftIcon={glyph}
        onClick={() => onRun("")}
      >
        {label}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant={variant} size="sm" isLoading={isLoading} leftIcon={glyph}>
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

export function ClientManagementFeature() {
  // The button lives here but every row it creates lives in ClientTable, so
  // this shared parent holds the open state and the table owns the form
  // itself — the same split the SKU page uses for Add item.
  const [addClientOpen, setAddClientOpen] = useState(false);

  // The client book addresses one MID in the request path, so a merchant sitting
  // on a Card Payments MID has no client book to show — the same guard
  // pg-dashboard applies on its own client page, expressed through
  // useResolvedMids' guardState.
  const { guardState } = useClientPathMid();
  const { needsMidChoice, midOptions, selectMid } = useClientMidScope();
  const { isConnected: isZohoConnected, isSyncing, syncClients } = useZohoClientSync();

  const openAddClient = (mid: string) => {
    // Scopes the page to that MID first, because the client the form creates
    // belongs to it and the merchant should end up looking at the list it is in.
    if (mid) selectMid(mid);
    setAddClientOpen(true);
  };

  if (guardState === "not-applicable") {
    return (
      <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
        <PageHeader title="Client management" />
        <SelectMidView midType="PACB" />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      {/* PageHeader puts `actions` at the far right of the title row, so the
          primary CTA sits opposite the title at every width. */}
      <PageHeader
        title="Client management"
        actions={
          <>
            {/* Only for a merchant who has actually connected Zoho — the action
                is meaningless otherwise, which is why production gates it on the
                same status rather than showing a disabled control. */}
            {isZohoConnected ? (
              <MidScopedAction
                label="Sync from Zoho"
                icon="zoho-logo"
                variant="ghost"
                isLoading={isSyncing}
                needsMidChoice={needsMidChoice}
                midOptions={midOptions}
                onRun={(mid) => syncClients(mid || undefined)}
              />
            ) : null}
            <MidScopedAction
              label="Add client"
              icon="plus"
              variant="primary"
              needsMidChoice={needsMidChoice}
              midOptions={midOptions}
              onRun={openAddClient}
            />
          </>
        }
      />

      <ClientTable addClientOpen={addClientOpen} onAddClientOpenChange={setAddClientOpen} />
    </div>
  );
}
