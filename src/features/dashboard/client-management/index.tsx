"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui";
import { MidScopedAction } from "@/components/common/MidScopedAction";
import { SelectMidView } from "@/components/common/SelectMidView";
import { usePacbMidScope } from "@/lib/hooks/usePacbMidScope";
import { useUrlAction } from "@/lib/hooks/useUrlAction";
import { ClientTable } from "@/features/dashboard/client-management/components/ClientTable";
import {
  useClientPathMid,
  useZohoClientSync,
} from "@/features/dashboard/client-management/hooks";

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
  const { needsMidChoice, midOptions, selectMid } = usePacbMidScope();
  const { isConnected: isZohoConnected, isSyncing, syncClients } = useZohoClientSync();

  const openAddClient = (mid: string) => {
    // Scopes the page to that MID first, because the client the form creates
    // belongs to it and the merchant should end up looking at the list it is in.
    if (mid) selectMid(mid);
    setAddClientOpen(true);
  };

  // "Add client" picked from the header search lands here as ?action=add-client.
  // It calls the same opener with "" that the button calls when there is no MID
  // to choose (see MidScopedAction), so the two entry points are one code path.
  // Held back until the MID list has loaded, and never fired while a choice is
  // pending or the page is showing its own MID picker instead of the list.
  useUrlAction(
    "add-client",
    () => openAddClient(""),
    guardState !== "not-applicable" && midOptions.length > 0 && !needsMidChoice
  );

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
