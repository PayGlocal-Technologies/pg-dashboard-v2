"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Field,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Shimmer,
  SingleSelect,
} from "@/components/ui";
import { useGet, usePut } from "@/lib/api/hooks";
import { getClientByIdApi, updateClientApi } from "@/features/dashboard/create-invoice/services";
import { useClientGeo, useInvoiceMerchantId } from "@/features/dashboard/create-invoice/hooks";
import type {
  Client,
  ClientAddress,
  ClientQueryResponse,
} from "@/features/dashboard/create-invoice/types";
import type { BaseResponse } from "@/types/common";

/**
 * The saved address, made safe to drive controlled inputs with.
 *
 * The API returns `null` — not `""` — for address fields that were never
 * filled in, which is exactly the case this dialog exists for (see
 * clientHasIncompleteAddress, which tests `value == null` for the same
 * reason). Spreading the record over string defaults would therefore put
 * `null` back into every missing field, so each key is coerced individually.
 */
function toFormAddress(saved: Partial<ClientAddress> | null | undefined): ClientAddress {
  return {
    streetAddress1: saved?.streetAddress1 ?? "",
    streetAddress2: saved?.streetAddress2 ?? "",
    city: saved?.city ?? "",
    state: saved?.state ?? "",
    country: saved?.country ?? "",
    zipcode: saved?.zipcode ?? "",
  };
}

/**
 * Completes a selected client's billing address.
 *
 * An invoice cannot be raised for a client whose address is missing fields, so
 * production force-opens this the moment such a client is picked. It PUTs the
 * whole client back with only the address replaced — the same
 * `{...client, address}` merge pg-dashboard's AddAddress drawer performs, which
 * is why untouched fields are carried through rather than re-sent as blanks.
 */
export function AddAddressDialog({
  open,
  onOpenChange,
  clientId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onSaved: () => void;
}) {
  const merchantId = useInvoiceMerchantId();

  const clientUrl = getClientByIdApi(merchantId, clientId);
  const { data, isLoading } = useGet<ClientQueryResponse>(
    ["mca-client", merchantId, clientId],
    clientUrl,
    undefined,
    { enabled: open && !!clientUrl }
  );

  const client = data?.data?.client;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogTitle>Complete billing address</DialogTitle>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          {client?.businessName ? (
            <>
              <span className="font-medium text-foreground">{client.businessName}</span> is missing
              address details an invoice needs.
            </>
          ) : (
            "This client is missing address details an invoice needs."
          )}
        </p>

        {isLoading || !client ? (
          <div className="mt-4 space-y-3">
            <Shimmer className="h-10 w-full" />
            <Shimmer className="h-10 w-full" />
            <Shimmer className="h-10 w-full" />
          </div>
        ) : (
          <AddressBody
            // Remount per client so the form seeds from that client's address in
            // a useState initializer. Copying fetched data into state from an
            // effect would be a cascading render.
            key={client.id}
            client={client}
            merchantId={merchantId}
            onCancel={() => onOpenChange(false)}
            onSaved={() => {
              onSaved();
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AddressBody({
  client,
  merchantId,
  onCancel,
  onSaved,
}: {
  client: Client;
  merchantId: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { countryOptions } = useClientGeo(true);

  const { mutate: updateClient, isPending } = usePut<BaseResponse<null>, Client>(
    updateClientApi(merchantId, client.id),
    { invalidateQueries: ["client-list"] }
  );

  const [address, setAddress] = useState<ClientAddress>(() => toFormAddress(client.address));

  const patch = (next: Partial<ClientAddress>) => setAddress((prev) => ({ ...prev, ...next }));

  const isComplete =
    !!address.streetAddress1.trim() &&
    !!address.city.trim() &&
    !!address.state.trim() &&
    !!address.country.trim() &&
    !!address.zipcode.trim();

  const handleSave = () => {
    if (!isComplete) return;

    updateClient(
      // Shipping address follows billing, matching production's default.
      { ...client, address, shippingAddress: address },
      {
        onSuccess: () => {
          toast.success("Address saved", { description: client.businessName });
          onSaved();
        },
        onError: (error) =>
          toast.error("Couldn't save the address", { description: error.message }),
      }
    );
  };

  return (
    <>
      <div className="mt-4 space-y-3">
        <Field>
          <FieldLabel htmlFor="client-address-street1">Address line 1</FieldLabel>
          <Input
            id="client-address-street1"
            placeholder="14 MG Road"
            value={address.streetAddress1}
            onChange={(e) => patch({ streetAddress1: e.target.value })}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-address-street2">Address line 2</FieldLabel>
          <Input
            id="client-address-street2"
            placeholder="Optional"
            value={address.streetAddress2}
            onChange={(e) => patch({ streetAddress2: e.target.value })}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="client-address-country">Country</FieldLabel>
            {/* Searchable for the same reason State is, only more so: this list
              runs to roughly 200 entries. flux's own CountrySelect is not usable
              here — it is hardwired to its internal COUNTRIES array, while these
              options come from the API and carry the country *names* the address
              is stored under. */}
            <SingleSelect
              id="client-address-country"
              value={address.country}
              // Clearing the state is what production's own country field
              // does (ADD_CLIENT_FIELDS_FORM_ADDRESS resets address.state on
              // change) — a state belongs to the country it was typed for.
              onChange={(next) => patch({ country: next, state: "" })}
              options={countryOptions}
              placeholder="Select country"
              searchPlaceholder="Search country…"
              emptyText="No country matches that search."
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="client-address-state">State</FieldLabel>
            {/* Free text, the control production uses here. The state
                reference list covers India only, so as a select this field
                offered a single "Not Applicable" option to every client outside
                it — which is why pg-dashboard replaced its own select with this
                input and left the select commented out beside it. */}
            <Input
              id="client-address-state"
              placeholder="Enter state"
              value={address.state}
              onChange={(e) => patch({ state: e.target.value })}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="client-address-city">City</FieldLabel>
            <Input
              id="client-address-city"
              placeholder="Bengaluru"
              value={address.city}
              onChange={(e) => patch({ city: e.target.value })}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="client-address-zip">Postal code</FieldLabel>
            <Input
              id="client-address-zip"
              placeholder="560001"
              value={address.zipcode}
              onChange={(e) => patch({ zipcode: e.target.value })}
            />
          </Field>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={!isComplete || isPending}
          onClick={handleSave}
        >
          {isPending ? "Saving…" : "Save address"}
        </Button>
      </div>
    </>
  );
}
