"use client";

import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Drawer,
  DrawerContent,
  DrawerTitle,
  Field,
  FieldError,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useBreakpoint,
} from "@/components/ui";
import { usePost } from "@/lib/api/hooks";
import { createClientApi } from "@/features/dashboard/create-invoice/services";
import { useClientGeo, useInvoiceMerchantId } from "@/features/dashboard/create-invoice/hooks";
import type {
  ClientCreateRequest,
  ClientCreateResponse,
} from "@/features/dashboard/create-invoice/types";

/**
 * Create a client without leaving the invoice.
 *
 * Deliberately NOT client-management's ClientFormModal: that form encodes
 * country as ISO2 and carries fields (tags, contract, business type) this
 * endpoint does not accept, whereas POST /mca-client/{mid}/create wants country
 * and state as names. Sharing the component would mean silently posting the
 * wrong vocabulary. Field set and payload here are copied from pg-dashboard's
 * AddClientForm.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function required(label: string) {
  return (value: string) => (value.trim() ? undefined : `${label} is required`);
}

interface FormValues {
  businessName: string;
  name: string;
  email: string;
  number: string;
  gstIn: string;
  streetAddress1: string;
  streetAddress2: string;
  city: string;
  country: string;
  state: string;
  zipcode: string;
}

const EMPTY: FormValues = {
  businessName: "",
  name: "",
  email: "",
  number: "",
  gstIn: "",
  streetAddress1: "",
  streetAddress2: "",
  city: "",
  country: "",
  state: "",
  zipcode: "",
};

export function AddClientDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fires with the new client's id so the invoice can select it immediately. */
  onCreated: (clientId: string) => void;
}) {
  const { isMobile } = useBreakpoint();

  const body = (
    <AddClientBody
      // Remount on open so a previous session's values and validation state
      // are discarded, matching the ClientFormModal pattern.
      key={open ? "open" : "closed"}
      onCancel={() => onOpenChange(false)}
      onCreated={(clientId) => {
        onCreated(clientId);
        onOpenChange(false);
      }}
    />
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} side="bottom">
        <DrawerContent className="flex max-h-[90vh] flex-col rounded-t-2xl p-0">
          <DrawerTitle className="sr-only">Add client</DrawerTitle>
          {body}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col p-0">
        <DialogTitle className="sr-only">Add client</DialogTitle>
        {body}
      </DialogContent>
    </Dialog>
  );
}

function AddClientBody({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (clientId: string) => void;
}) {
  const merchantId = useInvoiceMerchantId();
  const { countryOptions, stateOptionsFor } = useClientGeo(true);

  const { mutate: createClient, isPending } = usePost<ClientCreateResponse, ClientCreateRequest>(
    createClientApi(merchantId),
    // The invoice's client picker is keyed on the draft, so refresh everything
    // that lists clients once a new one exists.
    { invalidateQueries: ["client-list"] }
  );

  const form = useForm({
    defaultValues: EMPTY,
    onSubmit: ({ value }) => {
      createClient(
        {
          mid: merchantId,
          businessName: value.businessName.trim(),
          name: value.name.trim(),
          email: value.email.trim(),
          number: value.number.trim(),
          gstIn: value.gstIn.trim(),
          address: {
            streetAddress1: value.streetAddress1.trim(),
            streetAddress2: value.streetAddress2.trim(),
            city: value.city.trim(),
            state: value.state,
            country: value.country,
            zipcode: value.zipcode.trim(),
          },
        },
        {
          onSuccess: (response) => {
            const clientId = response?.data?.clientId;
            if (!clientId) {
              toast.error("Client created, but no id came back", {
                description: "Pick the client from the list to continue.",
              });
              return;
            }
            toast.success("Client added", { description: value.businessName.trim() });
            onCreated(clientId);
          },
          onError: (error) =>
            toast.error("Couldn't add the client", { description: error.message }),
        }
      );
    },
  });

  const selectedCountry = form.state.values.country;
  const stateOptions = stateOptionsFor(selectedCountry);

  return (
    <form
      noValidate
      className="flex min-h-0 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <div className="flex-shrink-0 border-b border-border px-5 py-4">
        <h2 className="text-[16px] font-semibold tracking-tight text-foreground">Add client</h2>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          A complete billing address is required before an invoice can be raised.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        <form.Field
          name="businessName"
          validators={{ onSubmit: ({ value }) => required("Business name")(value) }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor="add-client-business">Business name</FieldLabel>
              <Input
                id="add-client-business"
                placeholder="Acme Corp"
                value={field.state.value}
                aria-invalid={field.state.meta.errors.length > 0}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              <FieldError>{field.state.meta.errors[0]}</FieldError>
            </Field>
          )}
        </form.Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <form.Field
            name="name"
            validators={{ onSubmit: ({ value }) => required("Contact name")(value) }}
          >
            {(field) => (
              <Field>
                <FieldLabel htmlFor="add-client-name">Contact name</FieldLabel>
                <Input
                  id="add-client-name"
                  placeholder="Priya Mehta"
                  value={field.state.value}
                  aria-invalid={field.state.meta.errors.length > 0}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                <FieldError>{field.state.meta.errors[0]}</FieldError>
              </Field>
            )}
          </form.Field>

          <form.Field
            name="email"
            validators={{
              onSubmit: ({ value }) =>
                !value.trim()
                  ? "Email is required"
                  : EMAIL_PATTERN.test(value.trim())
                    ? undefined
                    : "Enter a valid email",
            }}
          >
            {(field) => (
              <Field>
                <FieldLabel htmlFor="add-client-email">Email</FieldLabel>
                <Input
                  id="add-client-email"
                  type="email"
                  placeholder="accounts@acme.in"
                  value={field.state.value}
                  aria-invalid={field.state.meta.errors.length > 0}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                <FieldError>{field.state.meta.errors[0]}</FieldError>
              </Field>
            )}
          </form.Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <form.Field name="number">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="add-client-number">Phone</FieldLabel>
                <Input
                  id="add-client-number"
                  inputMode="tel"
                  placeholder="9876543210"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </Field>
            )}
          </form.Field>

          <form.Field name="gstIn">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="add-client-gstin">GSTIN</FieldLabel>
                <Input
                  id="add-client-gstin"
                  placeholder="Optional"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
                  className="font-mono"
                />
              </Field>
            )}
          </form.Field>
        </div>

        <p className="pt-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          Billing address
        </p>

        <form.Field
          name="streetAddress1"
          validators={{ onSubmit: ({ value }) => required("Address line 1")(value) }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor="add-client-street1">Address line 1</FieldLabel>
              <Input
                id="add-client-street1"
                placeholder="14 MG Road"
                value={field.state.value}
                aria-invalid={field.state.meta.errors.length > 0}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              <FieldError>{field.state.meta.errors[0]}</FieldError>
            </Field>
          )}
        </form.Field>

        <form.Field name="streetAddress2">
          {(field) => (
            <Field>
              <FieldLabel htmlFor="add-client-street2">Address line 2</FieldLabel>
              <Input
                id="add-client-street2"
                placeholder="Optional"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </Field>
          )}
        </form.Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <form.Field
            name="country"
            validators={{ onSubmit: ({ value }) => required("Country")(value) }}
          >
            {(field) => (
              <Field>
                <FieldLabel htmlFor="add-client-country">Country</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(next) => {
                    field.handleChange(next);
                    // The state vocabulary depends on the country, so a stale
                    // Indian state must not survive a switch to another country.
                    form.setFieldValue("state", next === "India" ? "" : "OTHER COUNTRY");
                  }}
                >
                  <SelectTrigger
                    id="add-client-country"
                    className="w-full"
                    aria-invalid={field.state.meta.errors.length > 0}
                  >
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError>{field.state.meta.errors[0]}</FieldError>
              </Field>
            )}
          </form.Field>

          <form.Field
            name="state"
            validators={{ onSubmit: ({ value }) => required("State")(value) }}
          >
            {(field) => (
              <Field>
                <FieldLabel htmlFor="add-client-state">State</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={field.handleChange}
                  disabled={!selectedCountry}
                >
                  <SelectTrigger
                    id="add-client-state"
                    className="w-full"
                    aria-invalid={field.state.meta.errors.length > 0}
                  >
                    <SelectValue
                      placeholder={selectedCountry ? "Select state" : "Pick a country first"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {stateOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError>{field.state.meta.errors[0]}</FieldError>
              </Field>
            )}
          </form.Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <form.Field name="city" validators={{ onSubmit: ({ value }) => required("City")(value) }}>
            {(field) => (
              <Field>
                <FieldLabel htmlFor="add-client-city">City</FieldLabel>
                <Input
                  id="add-client-city"
                  placeholder="Bengaluru"
                  value={field.state.value}
                  aria-invalid={field.state.meta.errors.length > 0}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                <FieldError>{field.state.meta.errors[0]}</FieldError>
              </Field>
            )}
          </form.Field>

          <form.Field
            name="zipcode"
            validators={{ onSubmit: ({ value }) => required("Postal code")(value) }}
          >
            {(field) => (
              <Field>
                <FieldLabel htmlFor="add-client-zip">Postal code</FieldLabel>
                <Input
                  id="add-client-zip"
                  placeholder="560001"
                  value={field.state.value}
                  aria-invalid={field.state.meta.errors.length > 0}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                <FieldError>{field.state.meta.errors[0]}</FieldError>
              </Field>
            )}
          </form.Field>
        </div>
      </div>

      <div className="flex flex-shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={isPending}>
          {isPending ? "Adding…" : "Add client"}
        </Button>
      </div>
    </form>
  );
}
