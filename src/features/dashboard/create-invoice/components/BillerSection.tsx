"use client";

import { useState } from "react";
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
import { Icon } from "@/components/icon";
import { useClientGeo } from "@/features/dashboard/create-invoice/hooks";
import type { BillerDetails } from "@/features/dashboard/create-invoice/types";

function formatBillerAddress(biller: BillerDetails | undefined): string {
  if (!biller) return "";
  const cityLine = [biller.city, biller.state, biller.zipcode].filter(Boolean).join(", ");
  return [biller.streetAddress1, biller.streetAddress2, cityLine, biller.country]
    .filter(Boolean)
    .join(", ");
}

/**
 * "Who it's from".
 *
 * Nova hard-codes a biller profile in its mock data. Production fetches it from
 * get-biller-details and lets the merchant correct it per invoice, so that
 * editing is preserved here.
 *
 * The dialog only patches local state: `billerDetails` rides along on the next
 * autosave, exactly as production's own drawer does when it re-posts the whole
 * invoice with a merged biller block.
 */
export function BillerSection({
  billerDetails,
  isLoading,
  onChange,
}: {
  billerDetails: BillerDetails | undefined;
  isLoading: boolean;
  onChange: (next: BillerDetails) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);

  // Legal name folds into the Address row's value rather than sitting under
  // the heading as its own line or beside it inline — either of those grew
  // the header, and the name is exactly the kind of thing that address row
  // already exists to carry.
  const addressValue = [billerDetails?.legalName, formatBillerAddress(billerDetails)]
    .filter(Boolean)
    .join(" · ");

  const rows = [
    { label: "Address", value: addressValue },
    { label: "Phone", value: billerDetails?.phone },
    { label: "Email", value: billerDetails?.email },
    ...(billerDetails?.gstIn ? [{ label: "GSTIN", value: billerDetails.gstIn }] : []),
  ];

  return (
    <div className="rounded-xl border border-border p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name="receipt" className="h-4 w-4" />
          </span>
          <h2 className="text-[15px] font-semibold text-foreground">Who it&apos;s from</h2>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isLoading}
          leftIcon={<Icon name="pencil" className="h-3.5 w-3.5" />}
          onClick={() => setEditOpen(true)}
        >
          Edit
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Shimmer className="h-4 w-3/4" />
          <Shimmer className="h-4 w-1/2" />
        </div>
      ) : (
        <dl className="space-y-2">
          {rows.map((row) => (
            <div key={row.label} className="flex gap-3">
              <dt className="w-20 shrink-0 text-[12px] text-muted-foreground">{row.label}</dt>
              <dd className="min-w-0 text-[13px] text-foreground">{row.value || "-"}</dd>
            </div>
          ))}
        </dl>
      )}

      <EditBillerDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        billerDetails={billerDetails}
        onSave={onChange}
      />
    </div>
  );
}

function EditBillerDialog({
  open,
  onOpenChange,
  billerDetails,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billerDetails: BillerDetails | undefined;
  onSave: (next: BillerDetails) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogTitle>Edit biller details</DialogTitle>
        <EditBillerBody
          key={open ? "open" : "closed"}
          billerDetails={billerDetails}
          onCancel={() => onOpenChange(false)}
          onSave={(next) => {
            onSave(next);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function EditBillerBody({
  billerDetails,
  onCancel,
  onSave,
}: {
  billerDetails: BillerDetails | undefined;
  onCancel: () => void;
  onSave: (next: BillerDetails) => void;
}) {
  const [values, setValues] = useState<BillerDetails>(() => ({ ...(billerDetails ?? {}) }));
  const { countryOptions, stateOptions } = useClientGeo(true);

  const patch = (next: Partial<BillerDetails>) => setValues((prev) => ({ ...prev, ...next }));

  const isValid =
    !!values.legalName?.trim() &&
    !!values.streetAddress1?.trim() &&
    !!values.city?.trim() &&
    !!values.zipcode?.trim() &&
    !!values.email?.trim() &&
    !!values.phone?.trim();

  return (
    <div className="mt-4 space-y-3">
      <Field>
        <FieldLabel htmlFor="biller-legal-name">Legal name</FieldLabel>
        <Input
          id="biller-legal-name"
          value={values.legalName ?? ""}
          onChange={(e) => patch({ legalName: e.target.value })}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="biller-gstin">GSTIN</FieldLabel>
        <Input
          id="biller-gstin"
          className="font-mono"
          placeholder="Optional"
          value={values.gstIn ?? ""}
          onChange={(e) => patch({ gstIn: e.target.value.toUpperCase() })}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="biller-street1">Address</FieldLabel>
        <Input
          id="biller-street1"
          value={values.streetAddress1 ?? ""}
          onChange={(e) => patch({ streetAddress1: e.target.value })}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="biller-street2">Address line 2</FieldLabel>
        <Input
          id="biller-street2"
          placeholder="Optional"
          value={values.streetAddress2 ?? ""}
          onChange={(e) => patch({ streetAddress2: e.target.value })}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="biller-country">Country</FieldLabel>
          {/* Searchable for the same reason State is, only more so: this list
              runs to roughly 200 entries. flux's own CountrySelect is not usable
              here — it is hardwired to its internal COUNTRIES array, while these
              options come from the API and carry the country *names* the address
              is stored under. */}
          <SingleSelect
            id="biller-country"
            value={values.country ?? ""}
            // See AddAddressDialog's twin of this line.
            onChange={(next) => patch({ country: next, state: "" })}
            options={countryOptions}
            placeholder="Select country"
            searchPlaceholder="Search country…"
            emptyText="No country matches that search."
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="biller-state">State</FieldLabel>
          {/* A select over the whole state list, which is what production's
              biller form offers (EditBillerDetails maps every key of
              stateCodes into its own select, ungated by country — its form has
              no country field at all). Searchable because the list is long
              enough that scrolling a listbox is not reasonable. */}
          <SingleSelect
            id="biller-state"
            value={values.state ?? ""}
            onChange={(next) => patch({ state: next })}
            options={stateOptions}
            placeholder="Select state"
            searchPlaceholder="Search state…"
            emptyText="No state matches that search."
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="biller-city">City</FieldLabel>
          <Input
            id="biller-city"
            value={values.city ?? ""}
            onChange={(e) => patch({ city: e.target.value })}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="biller-zip">Zipcode</FieldLabel>
          <Input
            id="biller-zip"
            value={values.zipcode ?? ""}
            onChange={(e) => patch({ zipcode: e.target.value })}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="biller-email">Primary contact email</FieldLabel>
          <Input
            id="biller-email"
            type="email"
            value={values.email ?? ""}
            onChange={(e) => patch({ email: e.target.value })}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="biller-phone">Primary contact number</FieldLabel>
          <Input
            id="biller-phone"
            inputMode="tel"
            value={values.phone ?? ""}
            onChange={(e) => patch({ phone: e.target.value })}
          />
        </Field>
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={!isValid}
          onClick={() => onSave(values)}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
