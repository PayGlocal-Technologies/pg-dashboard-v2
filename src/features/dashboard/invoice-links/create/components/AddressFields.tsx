"use client";

import { Field, FieldError, FieldLabel, Input, SingleSelect } from "@/components/ui";
import {
  useInvoiceCountries,
  useInvoiceStates,
} from "@/features/dashboard/invoice-links/create/hooks";
import type { AddressValues } from "@/features/dashboard/invoice-links/create/types";

/**
 * The six address fields, shared by Billing and Shipping — upstream defines
 * them twice in constants.tsx with identical rules, so they are one component
 * here.
 *
 * Every field is optional upstream; only length and charset are enforced.
 * State options depend on the selected country, which is why picking a country
 * clears the state (upstream does the same on its country onChange).
 */
export function AddressFields({
  idPrefix,
  values,
  errors,
  onChange,
}: {
  idPrefix: string;
  values: AddressValues;
  errors: Partial<Record<keyof AddressValues, string>>;
  onChange: (next: Partial<AddressValues>) => void;
}) {
  const countries = useInvoiceCountries();
  const iso2 = countries.find((c) => c.value === values.country)?.iso2 ?? "";
  const states = useInvoiceStates(iso2);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor={`${idPrefix}-street`}>Street Address</FieldLabel>
        <Input
          id={`${idPrefix}-street`}
          placeholder="Enter Street Address"
          aria-invalid={!!errors.streetAddress}
          value={values.streetAddress}
          onChange={(e) => onChange({ streetAddress: e.target.value })}
        />
        <FieldError>{errors.streetAddress}</FieldError>
      </Field>

      <Field className="sm:col-span-2">
        <FieldLabel htmlFor={`${idPrefix}-landmark`}>Landmark</FieldLabel>
        <Input
          id={`${idPrefix}-landmark`}
          placeholder="Enter Landmark"
          aria-invalid={!!errors.landmark}
          value={values.landmark}
          onChange={(e) => onChange({ landmark: e.target.value })}
        />
        <FieldError>{errors.landmark}</FieldError>
      </Field>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-country`}>Country</FieldLabel>
        <SingleSelect
          id={`${idPrefix}-country`}
          value={values.country}
          // Changing country invalidates whatever state was picked under the
          // previous one, so it is cleared rather than left dangling.
          onChange={(next: string) => onChange({ country: next, state: "" })}
          options={countries.map((c) => ({ label: c.label, value: c.value }))}
          placeholder="Enter Country"
          searchPlaceholder="Search country…"
          emptyText="No country matches that search."
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-state`}>State</FieldLabel>
        <SingleSelect
          id={`${idPrefix}-state`}
          value={values.state}
          onChange={(next: string) => onChange({ state: next })}
          options={states.map((s) => ({ label: s, value: s }))}
          placeholder="Enter State"
          searchPlaceholder="Search state…"
          emptyText={values.country ? "No state matches that search." : "Pick a country first."}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-city`}>City</FieldLabel>
        <Input
          id={`${idPrefix}-city`}
          placeholder="Enter City"
          aria-invalid={!!errors.city}
          value={values.city}
          onChange={(e) => onChange({ city: e.target.value })}
        />
        <FieldError>{errors.city}</FieldError>
      </Field>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-zipcode`}>Zipcode</FieldLabel>
        <Input
          id={`${idPrefix}-zipcode`}
          placeholder="Eg. 560103"
          aria-invalid={!!errors.zipcode}
          value={values.zipcode}
          onChange={(e) => onChange({ zipcode: e.target.value })}
        />
        <FieldError>{errors.zipcode}</FieldError>
      </Field>
    </div>
  );
}
