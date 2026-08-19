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

  const rows = [
    { label: "Address", value: formatBillerAddress(billerDetails) },
    { label: "Phone", value: billerDetails?.phone },
    { label: "Email", value: billerDetails?.email },
    ...(billerDetails?.gstIn ? [{ label: "GSTIN", value: billerDetails.gstIn }] : []),
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name="receipt" className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Who it&apos;s from</h2>
            {billerDetails?.legalName && (
              <p className="text-[12px] text-muted-foreground">{billerDetails.legalName}</p>
            )}
          </div>
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
  const { countryOptions, stateOptionsFor } = useClientGeo(true);

  const patch = (next: Partial<BillerDetails>) => setValues((prev) => ({ ...prev, ...next }));

  const isValid =
    !!values.legalName?.trim() &&
    !!values.streetAddress1?.trim() &&
    !!values.city?.trim() &&
    !!values.zipcode?.trim() &&
    !!values.email?.trim() &&
    !!values.phone?.trim();

  const stateOptions = stateOptionsFor(values.country ?? "");

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
          <Select
            value={values.country ?? ""}
            onValueChange={(next) =>
              patch({ country: next, state: next === "India" ? "" : "OTHER COUNTRY" })
            }
          >
            <SelectTrigger id="biller-country" className="w-full">
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
        </Field>

        <Field>
          <FieldLabel htmlFor="biller-state">State</FieldLabel>
          <Select
            value={values.state ?? ""}
            onValueChange={(next) => patch({ state: next })}
            disabled={!values.country}
          >
            <SelectTrigger id="biller-state" className="w-full">
              <SelectValue placeholder={values.country ? "Select state" : "Pick a country first"} />
            </SelectTrigger>
            <SelectContent>
              {stateOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
