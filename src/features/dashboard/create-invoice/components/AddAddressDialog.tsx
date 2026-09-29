"use client";

import { toast } from "sonner";
import { Button, Dialog, DialogContent, DialogTitle, Shimmer } from "@/components/ui";
import { useAppForm } from "@/components/form/AppForm";
import { required, rules } from "@/components/form/rules";
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
      {/* Pinned header and footer around a scrolling body, so Save stays in
          view however tall the address form gets. */}
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <div className="shrink-0 border-b border-border px-6 py-4 pr-14">
          <DialogTitle>Complete billing address</DialogTitle>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {client?.businessName ? (
              <>
                <span className="font-medium text-foreground">{client.businessName}</span> is
                missing address details an invoice needs.
              </>
            ) : (
              "This client is missing address details an invoice needs."
            )}
          </p>
        </div>

        {isLoading || !client ? (
          <div className="space-y-3 px-6 py-5">
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

  // Every field but line 2 is required (clientHasIncompleteAddress tests the
  // same five); their * comes from `required(...)`. See components/form.
  const form = useAppForm({
    defaultValues: toFormAddress(client.address),
    onSubmit: ({ value: address }) => {
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
    },
  });

  return (
    <form.AppForm>
      <form.Form className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-5">
          <form.AppField
            name="streetAddress1"
            validators={{ onChange: rules(required("Address line 1")) }}
          >
            {(field) => (
              <field.TextField
                id="client-address-street1"
                label="Address line 1"
                placeholder="14 MG Road"
              />
            )}
          </form.AppField>

          <form.AppField name="streetAddress2">
            {(field) => (
              <field.TextField
                id="client-address-street2"
                label="Address line 2"
                placeholder="Optional"
              />
            )}
          </form.AppField>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Searchable for the same reason State is, only more so: this list
              runs to roughly 200 entries. flux's own CountrySelect is not usable
              here — it is hardwired to its internal COUNTRIES array, while these
              options come from the API and carry the country *names* the address
              is stored under. */}
            <form.AppField name="country" validators={{ onChange: rules(required("Country")) }}>
              {(field) => (
                <field.SingleSelectField
                  id="client-address-country"
                  label="Country"
                  options={countryOptions}
                  placeholder="Select country"
                  searchPlaceholder="Search country…"
                  emptyText="No country matches that search."
                  // Clearing the state is what production's own country field
                  // does (ADD_CLIENT_FIELDS_FORM_ADDRESS resets address.state on
                  // change) — a state belongs to the country it was typed for.
                  onValueChange={() => form.setFieldValue("state", "")}
                />
              )}
            </form.AppField>

            {/* Free text, the control production uses here. The state
                reference list covers India only, so as a select this field
                offered a single "Not Applicable" option to every client outside
                it — which is why pg-dashboard replaced its own select with this
                input and left the select commented out beside it. */}
            <form.AppField name="state" validators={{ onChange: rules(required("State")) }}>
              {(field) => (
                <field.TextField
                  id="client-address-state"
                  label="State"
                  placeholder="Enter state"
                />
              )}
            </form.AppField>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <form.AppField name="city" validators={{ onChange: rules(required("City")) }}>
              {(field) => (
                <field.TextField id="client-address-city" label="City" placeholder="Bengaluru" />
              )}
            </form.AppField>

            <form.AppField name="zipcode" validators={{ onChange: rules(required("Postal code")) }}>
              {(field) => (
                <field.TextField id="client-address-zip" label="Postal code" placeholder="560001" />
              )}
            </form.AppField>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <form.SubmitButton pending={isPending}>
            {isPending ? "Saving…" : "Save address"}
          </form.SubmitButton>
        </div>
      </form.Form>
    </form.AppForm>
  );
}
