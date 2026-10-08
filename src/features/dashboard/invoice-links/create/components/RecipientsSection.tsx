"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  FieldError,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Popover,
  PopoverAnchor,
  PopoverContent,
  Shimmer,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
// The Clients page's own Add client form, as the MCA editor's Bill-to card
// uses it, so a client added here is the same record everywhere.
import { ClientFormModal } from "@/features/dashboard/client-management/components/ClientFormModal";
import {
  toClientApiPayload,
  useClientContractUpload,
  useClientCountryMap,
  useCreateClient,
} from "@/features/dashboard/client-management/hooks";
import { emptyClientForm } from "@/features/dashboard/client-management/schemas";
import type { Client, ClientFormValues } from "@/features/dashboard/client-management/types";
import { EditorSection } from "@/features/dashboard/invoice-links/create/components/EditorSection";
import {
  clientToRecipient,
  validateRecipient,
} from "@/features/dashboard/invoice-links/create/helpers";
import { useInvoiceLinkClients } from "@/features/dashboard/invoice-links/create/hooks";
import type {
  AddressValues,
  InvoiceRecipient,
} from "@/features/dashboard/invoice-links/create/types";

const SEARCH_DEBOUNCE_MS = 300;

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatAddress(address: AddressValues): string {
  const cityLine = [address.city, address.state, address.zipcode].filter(Boolean).join(", ");
  return [address.streetAddress, address.landmark, cityLine, address.country]
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

type RecipientsUpdate = (prev: InvoiceRecipient[]) => InvoiceRecipient[];

/**
 * "Who you're billing": one or more clients from the client book.
 *
 * The search field and list are the MCA editor's Bill-to picker
 * (create-invoice's BillToSection), changed in one respect: picking toggles a
 * client in or out and leaves the list open, because this editor can issue one
 * link per client in a single request. The picked clients are listed under
 * the field with whatever would stop their link being created, so a client
 * with no phone number is caught here rather than at submit.
 */
export function RecipientsSection({
  mid,
  recipients,
  onChange,
  error,
  requiredAddresses,
}: {
  mid: string;
  recipients: InvoiceRecipient[];
  /** From the merchant's payment-link form config: addresses each client must have. */
  requiredAddresses?: { billing: boolean; shipping: boolean };
  /** An updater, not a value: a client added from the modal lands asynchronously. */
  onChange: (update: RecipientsUpdate) => void;
  /** Section-level error, e.g. nothing picked. */
  error?: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [addClientSeed, setAddClientSeed] = useState<string | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  // The search runs server-side, so typing is debounced. setState happens in
  // the timer callback, never in the effect body.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const { clients, isLoading, isError, refetch, fetchClient } = useInvoiceLinkClients(mid, search);

  const countryMap = useClientCountryMap();
  const { createClient } = useCreateClient(mid);
  const { uploadContract } = useClientContractUpload(mid);

  const selectedIds = useMemo(() => new Set(recipients.map((r) => r.key)), [recipients]);

  const toggle = (client: Client) => {
    onChange((prev) =>
      prev.some((r) => r.key === client.id)
        ? prev.filter((r) => r.key !== client.id)
        : [...prev, clientToRecipient(client)]
    );
  };

  const remove = (key: string) => onChange((prev) => prev.filter((r) => r.key !== key));

  const openAddClient = (seed: string | null) => {
    setPickerOpen(false);
    setAddClientSeed(seed);
    setAddClientOpen(true);
  };

  const onSubmitClient = (values: ClientFormValues) => {
    const payload = toClientApiPayload(values, (iso2) =>
      iso2 ? (countryMap.iso2ToApiCountry[iso2.toUpperCase()] ?? iso2) : ""
    );

    createClient(payload, (newClientId) => {
      if (!newClientId) return;
      const file = values.contract?.file;
      if (file) uploadContract({ clientId: newClientId, file });
      // Read back rather than rebuilt from the form, so the recipient carries
      // exactly what the server stored (split phone, resolved country).
      fetchClient(newClientId, (client) =>
        onChange((prev) =>
          prev.some((r) => r.key === client.id) ? prev : [...prev, clientToRecipient(client)]
        )
      );
    });

    setAddClientOpen(false);
  };

  const isInsideAnchor = (target: EventTarget | null) =>
    target instanceof Node && !!anchorRef.current?.contains(target);

  const typed = query.trim();
  // The list reflects the debounced search; while the two disagree the
  // results are for an older query, so the empty-state offer waits.
  const isSettled = typed === search && !isLoading;

  return (
    <EditorSection
      icon="user"
      title="Who you're billing"
      subtitle={
        recipients.length > 1
          ? `${recipients.length} clients · one invoice link each`
          : "Pick one or more clients"
      }
    >
      <Popover
        open={pickerOpen}
        onOpenChange={(next) => {
          setPickerOpen(next);
          if (!next) setQuery("");
        }}
      >
        <PopoverAnchor asChild>
          <InputGroup ref={anchorRef}>
            <InputGroupAddon align="inline-start">
              <Icon name="search" className="h-3.5 w-3.5 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              autoComplete="off"
              role="combobox"
              aria-expanded={pickerOpen}
              aria-haspopup="listbox"
              aria-controls="invoice-link-client-listbox"
              aria-invalid={!!error}
              disabled={!mid}
              value={query}
              onFocus={() => setPickerOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!pickerOpen) setPickerOpen(true);
              }}
              placeholder={recipients.length ? "Add another client" : "Choose clients"}
              className="text-[13px]"
            />
            <InputGroupAddon align="inline-end">
              <Icon
                name="chevron-down"
                className={cn(
                  "h-3.5 w-3.5 text-muted-foreground opacity-70 transition-transform",
                  pickerOpen && "rotate-180"
                )}
              />
            </InputGroupAddon>
          </InputGroup>
        </PopoverAnchor>

        {/* Pinned below the field, as BillToSection does, so the list never
            flips up over the field being typed into. */}
        <PopoverContent
          side="bottom"
          align="start"
          avoidCollisions={false}
          className="w-(--radix-popover-trigger-width) min-w-[min(24rem,calc(100vw-3rem))] p-0 shadow-none"
          onOpenAutoFocus={(e) => e.preventDefault()}
          // The field is the anchor, outside the portaled panel; focus or a
          // click landing on it must not read as a click-away.
          onFocusOutside={(e) => {
            if (isInsideAnchor(e.target)) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (isInsideAnchor(e.target)) e.preventDefault();
          }}
        >
          <Command>
            <CommandList
              id="invoice-link-client-listbox"
              aria-label="Clients"
              aria-multiselectable
              className="max-h-72"
            >
              {isLoading ? (
                <div className="space-y-2 p-3">
                  <Shimmer className="h-9 w-full rounded-md" />
                  <Shimmer className="h-9 w-full rounded-md" />
                </div>
              ) : isError ? (
                <div className="flex items-center justify-between gap-3 p-3 text-[12.5px] text-muted-foreground">
                  Couldn&apos;t load your clients.
                  <Button type="button" variant="link" size="sm" onClick={refetch}>
                    Retry
                  </Button>
                </div>
              ) : clients.length === 0 ? (
                <CommandEmpty>
                  {typed && isSettled ? (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className="w-full justify-start"
                      leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
                      onClick={() => openAddClient(typed)}
                    >
                      Add &ldquo;{typed}&rdquo;
                    </Button>
                  ) : typed ? (
                    "Searching…"
                  ) : (
                    "No clients yet."
                  )}
                </CommandEmpty>
              ) : (
                // A small gap between rows, so a hovered row never butts
                // against its neighbour.
                <CommandGroup className="space-y-0.5">
                  {clients.map((client) => {
                    const isSelected = selectedIds.has(client.id);
                    return (
                      // No `selected` fill: this list is multi-select, and
                      // CommandItem's fill is meant for a single pick — two
                      // picked rows in a row merged into one grey block. The
                      // checkmark says what is picked; grey is for hover only.
                      // aria-selected still carries the state.
                      <CommandItem
                        key={client.id}
                        aria-selected={isSelected}
                        onSelect={() => toggle(client)}
                        className="gap-3"
                      >
                        <ContactAvatar name={client.businessName || client.primaryContactName} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-foreground">
                            {client.businessName || client.primaryContactName}
                          </span>
                          <span className="block truncate text-[11.5px] text-muted-foreground">
                            {[client.primaryContactName, client.email].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <Icon
                          name="check"
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 text-primary",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>

          {!(clients.length === 0 && typed && isSettled) && (
            <div className="border-t border-border p-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full shadow-none"
                leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
                onClick={() => openAddClient(null)}
              >
                Add a new client
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {error ? <FieldError className="mt-1.5">{error}</FieldError> : null}

      {recipients.length > 0 ? (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
          {recipients.map((recipient) => {
            const issues = validateRecipient(recipient, requiredAddresses);
            const address = formatAddress(recipient.billing);
            return (
              <li key={recipient.key} className="flex items-start gap-3 px-3 py-2.5">
                <ContactAvatar name={recipient.fullName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-foreground">
                    {recipient.fullName || "Unnamed customer"}
                    {recipient.contactName && recipient.contactName !== recipient.fullName ? (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · {recipient.contactName}
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {[
                      recipient.emailId,
                      [recipient.callingCode, recipient.phoneNumber].filter(Boolean).join(" "),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {address ? (
                    <p className="truncate text-[12px] text-muted-foreground">{address}</p>
                  ) : null}
                  {recipient.clientId === null ? (
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                      Saved on this draft, not linked to a client
                    </p>
                  ) : null}
                  {issues.length > 0 ? (
                    <p className="mt-1 flex items-start gap-1.5 text-[12px] text-amber-700 dark:text-amber-500">
                      <Icon name="alert-triangle" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {issues.join(". ")}. Update this client to create their link.
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${recipient.fullName || "customer"}`}
                  className="h-7 w-7 shrink-0 p-0"
                  onClick={() => remove(recipient.key)}
                >
                  <Icon name="x" className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <ClientFormModal
        open={addClientOpen}
        onOpenChange={(next) => {
          setAddClientOpen(next);
          if (!next) setAddClientSeed(null);
        }}
        mode="add"
        initialValues={
          addClientSeed ? { ...emptyClientForm(), businessName: addClientSeed } : undefined
        }
        onSubmit={onSubmitClient}
        midOverride={mid}
      />
    </EditorSection>
  );
}
