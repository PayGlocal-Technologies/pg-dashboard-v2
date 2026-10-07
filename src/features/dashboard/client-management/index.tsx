"use client";

import { useState } from "react";
import { Button, PageHeader } from "@/components/ui";
import { PageIntroBanner } from "@/components/common/PageIntroBanner";
import { Icon } from "@/components/icon";
import { MidScopedAction } from "@/components/common/MidScopedAction";
import { useUrlAction } from "@/lib/hooks/useUrlAction";
import { ClientTable } from "@/features/dashboard/client-management/components/ClientTable";
import { useClientMidScope, useZohoClientSync } from "@/features/dashboard/client-management/hooks";
import { zohoSyncLabel } from "@/features/dashboard/zoho-integration/hooks";

export function ClientManagementFeature() {
  // The button lives here but every row it creates lives in ClientTable, so
  // this shared parent holds the open state and the table owns the form
  // itself — the same split the SKU page uses for Add item.
  const [addClientOpen, setAddClientOpen] = useState(false);

  // The client book spans Card Payments (PA) and Global Fund Transfer (PACB)
  // MIDs alike. It used to be PACB-only, with a Card Payments selection shown a
  // "pick a Global Fund Transfer MID" screen instead (pg-dashboard's guard);
  // that guard is gone with the scope.
  const { needsMidChoice, midOptions, selectMid } = useClientMidScope();
  const {
    isConnected: isZohoConnected,
    isSyncing,
    syncClients,
    connectedMid,
    hasMultipleMids,
  } = useZohoClientSync();

  const openAddClient = (mid: string) => {
    // Scopes the page to that MID first, because the client the form creates
    // belongs to it and the merchant should end up looking at the list it is in.
    // "" means there was nothing to ask. With exactly one MID that is the one,
    // named explicitly: a multi-MID account with nothing selected otherwise
    // resolves the path to its UCIC id, and a client is created under a MID.
    const target = mid || (midOptions.length === 1 ? midOptions[0] : "");
    if (target) selectMid(target);
    setAddClientOpen(true);
  };

  // "Add client" picked from the header search lands here as ?action=add-client.
  // It calls the same opener with "" that the button calls when there is no MID
  // to choose (see MidScopedAction), so the two entry points are one code path.
  // Held back until the MID list has loaded, and never fired while a choice is
  // pending.
  useUrlAction("add-client", () => openAddClient(""), midOptions.length > 0 && !needsMidChoice);

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      {/* Top of the page, above the title and its CTAs: what this page is
          for. Shows on every load; the × hides it until the next one. */}
      <PageIntroBanner
        image="/assets/Client management.png"
        aspectClassName="aspect-4680/892"
        title="All your clients in one place"
        description="Every transaction automatically saves the client here. You can also add your own clients anytime."
      />
      {/* PageHeader puts `actions` at the far right of the title row, so the
          primary CTA sits opposite the title at every width. */}
      <PageHeader
        title="Client management"
        actions={
          <>
            {/* Only for a merchant who has actually connected Zoho — the action
                is meaningless otherwise, which is why production gates it on the
                same status rather than showing a disabled control. No MID
                picker: the pull goes to the MID the Zoho account is linked to,
                which the label names when there is more than one account. */}
            {isZohoConnected ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<Icon name="zoho-logo" className="h-3.5 w-3.5" />}
                isLoading={isSyncing}
                onClick={syncClients}
              >
                {zohoSyncLabel(connectedMid, hasMultipleMids)}
              </Button>
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

      <ClientTable
        addClientOpen={addClientOpen}
        onAddClientOpenChange={setAddClientOpen}
        onAddClient={openAddClient}
      />
    </div>
  );
}
