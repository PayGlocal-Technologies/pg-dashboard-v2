"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { useInvoiceClients, useInvoiceMerchantId } from "@/features/dashboard/create-invoice/hooks";
import { validateSelectedClient } from "@/features/dashboard/create-invoice/helpers";
import { ClientFormModal } from "@/features/dashboard/client-management/components/ClientFormModal";
import {
  toClientApiPayload,
  useClientContractUpload,
  useClientCountryMap,
  useCreateClient,
} from "@/features/dashboard/client-management/hooks";
import { emptyClientForm } from "@/features/dashboard/client-management/schemas";
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
  // Seeds the Add client modal's businessName when it's opened from "Add
  // “{query}” as a new client" rather than the plain "Add a new client" row
  // — null for the latter, so the form opens blank the way it always did.
  const [addClientSeed, setAddClientSeed] = useState<string | null>(null);
  const [addressOpen, setAddressOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

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

  const openAddClient = (seed: string | null) => {
    setPickerOpen(false);
    setAddClientSeed(seed);
    setAddClientOpen(true);
  };

  // Focusing the search input only needs the DOM node, no state update — safe
  // inside the effect body itself (no synchronous setState here). Same
  // pattern PurposeCodeCombobox uses for its own Popover+Command dropdown.
  useEffect(() => {
    if (!pickerOpen) return;
    const focusTimer = setTimeout(() => searchRef.current?.focus(), 0);
    return () => clearTimeout(focusTimer);
  }, [pickerOpen]);

  return (
    <div className="rounded-xl border border-border p-5">
      {/* One Popover wraps the header's Edit trigger AND (when nothing is
          selected yet) the dropdown trigger further down — both need to be
          descendants of the same Popover, not siblings of it, for either
          trigger to actually open it. Anchors to whichever of the two is on
          screen. The list itself is identical either way: every client
          directly, no extra click through a "Select client" button first,
          and "Add a new client" pinned as its own row regardless of what's
          been searched. */}
      <Popover
        open={pickerOpen}
        onOpenChange={(next) => {
          setPickerOpen(next);
          if (!next) setQuery("");
        }}
      >
        {/* Same header shape as BillerSection ("Who it's from") above it:
            icon, plain title, an Edit button on the right. The selected
            client's name used to run under the title as a subtitle, which
            grew the card whenever one was picked and could crowd the pencil
            beside it — it now folds into the Contact row below instead,
            the same way BillerSection's legal name folds into its Address
            row. */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon name="users" className="h-4 w-4" />
            </span>
            <h2 className="text-[15px] font-semibold text-foreground">Who it&apos;s for</h2>
          </div>

          {selected && (
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-haspopup="listbox"
                aria-controls="bill-to-client-listbox"
                leftIcon={<Icon name="pencil" className="h-3.5 w-3.5" />}
              >
                Edit
              </Button>
            </PopoverTrigger>
          )}
        </div>

        {selected ? (
          // Plain rows, no bordered box around them — this already sits
          // inside the page's own flow (no card here to nest a second box
          // inside of), same as BillerSection's address/phone/email rows.
          selected.businessName || selected.name || formatAddress(selected.address) ? (
            <dl className="space-y-2">
              {(selected.businessName || selected.name) && (
                <div className="flex gap-3">
                  <dt className="w-20 shrink-0 text-[12px] text-muted-foreground">Contact</dt>
                  <dd className="min-w-0 text-[13px] text-foreground">
                    {selected.businessName || selected.name}
                    {selected.businessName &&
                      selected.name &&
                      selected.name !== selected.businessName && (
                        <span className="text-muted-foreground"> · {selected.name}</span>
                      )}
                  </dd>
                </div>
              )}
              {formatAddress(selected.address) && (
                <div className="flex gap-3">
                  <dt className="w-20 shrink-0 text-[12px] text-muted-foreground">Address</dt>
                  <dd className="min-w-0 text-[13px] text-foreground">
                    {formatAddress(selected.address)}
                  </dd>
                </div>
              )}
            </dl>
          ) : null
        ) : (
          <PopoverTrigger asChild>
            <button
              type="button"
              role="combobox"
              aria-expanded={pickerOpen}
              aria-haspopup="listbox"
              aria-controls="bill-to-client-listbox"
              disabled={!invoiceId}
              className={cn(
                "flex h-11 w-full items-center justify-between gap-2.5 rounded-lg border bg-card px-3.5 text-left text-[13px] shadow-none",
                "transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35",
                "disabled:cursor-not-allowed disabled:opacity-60",
                "border-border"
              )}
            >
              <span className="flex items-center gap-2 text-muted-foreground">
                <Icon name="search" className="h-3.5 w-3.5 shrink-0" />
                {invoiceId ? "Choose a client" : "Preparing the draft…"}
              </span>
              <Icon
                name="chevron-down"
                className={cn(
                  "h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-70 transition-transform",
                  pickerOpen && "rotate-180"
                )}
              />
            </button>
          </PopoverTrigger>
        )}

        {/* side="bottom" + avoidCollisions={false}: Radix's default is to
            flip the panel above the trigger when the viewport runs out of
            room below, which for a field this far down the form meant the
            list could cover the very field you were filling in. Pinned
            below, it always grows in the direction you're reading. */}
        <PopoverContent
          side="bottom"
          align="start"
          avoidCollisions={false}
          className="w-(--radix-popover-trigger-width) min-w-[min(24rem,calc(100vw-3rem))] p-0 shadow-none"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandInput
              ref={searchRef}
              placeholder="Search clients…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <CommandList id="bill-to-client-listbox" aria-label="Clients">
              {visibleClients.length === 0 && (
                <CommandEmpty>
                  <div className="flex flex-col items-center gap-2 py-1 text-center">
                    <span>
                      {query.trim() ? `No client matches “${query.trim()}”.` : "No clients yet."}
                    </span>
                    {query.trim() && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0"
                        onClick={() => openAddClient(query.trim())}
                      >
                        Add &ldquo;{query.trim()}&rdquo; as a new client
                      </Button>
                    )}
                  </div>
                </CommandEmpty>
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

          {/* Pinned outside CommandList so it never scrolls out of view along
              with the client list above it — "constantly present" the way a
              regular row can't guarantee once there are enough clients to
              scroll. */}
          <div className="border-t border-border p-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full"
              leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
              onClick={() => openAddClient(null)}
            >
              Add a new client
            </Button>
          </div>
        </PopoverContent>
      </Popover>

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

      <ClientFormModal
        open={addClientOpen}
        onOpenChange={(next) => {
          setAddClientOpen(next);
          if (!next) setAddClientSeed(null);
        }}
        mode="add"
        // Seeded with whatever the merchant had already typed into the
        // client search when they had no match for it — still an "add",
        // still editable, just not starting from a blank businessName field.
        initialValues={
          addClientSeed ? { ...emptyClientForm(), businessName: addClientSeed } : undefined
        }
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
