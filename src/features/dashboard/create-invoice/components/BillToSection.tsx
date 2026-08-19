"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Callout,
  CalloutText,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import {
  useInvoiceClients,
  useInvoiceMerchantId,
} from "@/features/dashboard/create-invoice/hooks";
import { validateSelectedClient } from "@/features/dashboard/create-invoice/helpers";
import { ClientFormModal } from "@/features/dashboard/client-management/components/ClientFormModal";
import {
  toClientApiPayload,
  useClientContractUpload,
  useClientCountryMap,
  useCreateClient,
} from "@/features/dashboard/client-management/hooks";
import { AddAddressDialog } from "@/features/dashboard/create-invoice/components/AddAddressDialog";
import type { Address, ClientData } from "@/features/dashboard/create-invoice/types";
import type { ClientFormValues } from "@/features/dashboard/client-management/types";

/** Initials for the contact avatar, at most two letters. */
function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatAddress(address: Address | undefined): string {
  if (!address) return "";
  const cityLine = [address.city, address.state, address.zipcode].filter(Boolean).join(", ");
  return [address.streetAddress1, address.streetAddress2, cityLine, address.country]
    .filter(Boolean)
    .join(", ");
}

function ContactAvatar({ name }: { name: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[12px] font-semibold text-primary">
      {initialsOf(name) || "?"}
    </span>
  );
}

/**
 * "Who it's for".
 *
 * Nova models this as a list of recipients with roles and notification
 * channels. The API has one `clientId` per invoice and no recipient collection,
 * so this keeps Nova's card but binds it to the single client production
 * supports. Extra recipients are still reachable at send time, as cc/bcc on the
 * email drawer.
 */
export function BillToSection({
  invoiceId,
  clientId,
  onClientIdChange,
  remitterName,
}: {
  invoiceId: string;
  clientId: string;
  onClientIdChange: (clientId: string) => void;
  /** Remitter on the linked transaction, when creating from ?gid=. */
  remitterName: string | null | undefined;
}) {
  const { clients, refetch } = useInvoiceClients(invoiceId);

  // The same Add client form the client-management page uses, exactly as
  // pg-dashboard does — its create-invoice step imports mca-clients'
  // AddClientForm rather than keeping a second one, and passes the MID this flow
  // resolved (`selectedMidForAddClient`) because the client page reads its own
  // off the URL. `midOverride` is that argument.
  const merchantId = useInvoiceMerchantId();
  const countryMap = useClientCountryMap();
  const { createClient } = useCreateClient(merchantId);
  const { uploadContract } = useClientContractUpload(merchantId);

  const onSubmitClient = (values: ClientFormValues, keepOpen: boolean) => {
    const payload = toClientApiPayload(values, (iso2) =>
      iso2 ? (countryMap.iso2ToApiCountry[iso2.toUpperCase()] ?? iso2) : ""
    );

    createClient(payload, (newClientId) => {
      if (!newClientId) return;
      // A contract can only be attached to a client that exists, so it follows
      // the create rather than riding along with it.
      const file = values.contract?.file;
      if (file) uploadContract({ clientId: newClientId, file });
      onClientIdChange(newClientId);
      refetch();
    });

    if (!keepOpen) setAddClientOpen(false);
  };

  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);

  const selected = useMemo(
    () => clients.find((client) => client.id === clientId),
    [clients, clientId]
  );

  const issue = validateSelectedClient(clientId, clients, remitterName);

  // flux's Command is a presentational shell, not cmdk — it does no filtering
  // of its own, so the search is applied here and only matches are rendered.
  const visibleClients = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return clients;
    return clients.filter(
      (client) =>
        client.businessName?.toLowerCase().includes(needle) ||
        client.name?.toLowerCase().includes(needle)
    );
  }, [clients, query]);

  const selectClient = (client: ClientData) => {
    onClientIdChange(client.id);
    setPickerOpen(false);
    setQuery("");
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name="users" className="h-4 w-4" />
          </span>
          <h2 className="text-[15px] font-semibold text-foreground">Who it&apos;s for</h2>
        </div>

        {selected && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<Icon name="pencil" className="h-3.5 w-3.5" />}
            onClick={() => setPickerOpen(true)}
          >
            Change
          </Button>
        )}
      </div>

      {selected ? (
        <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
          <div className="flex items-center gap-3">
            <ContactAvatar name={selected.businessName || selected.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium text-foreground">
                {selected.businessName || selected.name}
              </p>
              {selected.name && selected.businessName && (
                <p className="truncate text-[12px] text-muted-foreground">{selected.name}</p>
              )}
              {formatAddress(selected.address) && (
                <p className="truncate text-[11.5px] text-muted-foreground">
                  {formatAddress(selected.address)}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-6 text-center">
          <p className="text-[12.5px] text-muted-foreground">
            {invoiceId
              ? "No client selected yet. Pick who this invoice bills."
              : "Preparing the draft…"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!invoiceId}
              leftIcon={<Icon name="search" className="h-3.5 w-3.5" />}
              onClick={() => setPickerOpen(true)}
            >
              Select client
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!invoiceId}
              leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
              onClick={() => setAddClientOpen(true)}
            >
              Add new
            </Button>
          </div>
        </div>
      )}

      {/* Both gates production enforces, surfaced where the choice was made
          rather than only at submit time. */}
      {issue.kind === "incomplete-address" && (
        <Callout variant="warning" className="mt-3">
          <CalloutText>
            This client&apos;s billing address is incomplete, so the invoice cannot be generated
            yet.{" "}
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 align-baseline text-sm"
              onClick={() => setAddressOpen(true)}
            >
              Complete address
            </Button>
          </CalloutText>
        </Callout>
      )}

      {issue.kind === "remitter-mismatch" && (
        <Callout variant="error" className="mt-3">
          <CalloutText>
            {issue.clientName
              ? `"${issue.clientName}" does not match the remitter on the linked transaction ("${issue.remitterName}").`
              : `The selected client does not match the remitter on the linked transaction ("${issue.remitterName}").`}{" "}
            Pick the matching client to continue.
          </CalloutText>
        </Callout>
      )}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-md p-0">
          <DialogTitle className="px-4 pt-4">Select client</DialogTitle>
          <Command className="mt-2">
            <CommandInput
              placeholder="Search clients…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <CommandList>
              {visibleClients.length === 0 && (
                <CommandEmpty>No clients match that search.</CommandEmpty>
              )}
              <CommandGroup>
                {visibleClients.map((client) => (
                  <CommandItem
                    key={client.id}
                    selected={client.id === clientId}
                    onSelect={() => selectClient(client)}
                    className="gap-3"
                  >
                    <ContactAvatar name={client.businessName || client.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-foreground">
                        {client.businessName || client.name}
                      </span>
                      <span className="block truncate text-[11.5px] text-muted-foreground">
                        {client.name}
                      </span>
                    </span>
                    <Icon
                      name="check"
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 text-primary",
                        client.id === clientId ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>

          <div className="border-t border-border p-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full"
              leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
              onClick={() => {
                setPickerOpen(false);
                setAddClientOpen(true);
              }}
            >
              Add a new client
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ClientFormModal
        open={addClientOpen}
        onOpenChange={setAddClientOpen}
        mode="add"
        onSubmit={onSubmitClient}
        midOverride={merchantId}
      />

      <AddAddressDialog
        open={addressOpen}
        onOpenChange={setAddressOpen}
        clientId={clientId}
        onSaved={refetch}
      />
    </div>
  );
}
