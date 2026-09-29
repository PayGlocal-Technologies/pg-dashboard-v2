"use client";

import { useState } from "react";
import { Button, Dialog, DialogContent, DialogTitle, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { useAppForm } from "@/components/form/AppForm";
import { required, rules } from "@/components/form/rules";
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
      {/* Header, scrolling body, pinned footer (AddTeamMemberModal's layout):
          the field list outgrows short viewports, and Cancel/Save must not
          scroll away with it. */}
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <div className="shrink-0 border-b border-border px-6 py-4 pr-14">
          <DialogTitle>Edit biller details</DialogTitle>
        </div>
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
  const { countryOptions, stateOptions } = useClientGeo(true);

  // The whole record rides through, so keys this form doesn't show are saved
  // back untouched, exactly as the old useState copy did.
  const form = useAppForm({
    defaultValues: { ...(billerDetails ?? {}) } as BillerDetails,
    onSubmit: ({ value }) => onSave(value),
  });

  // The same six production's EditBillerDetails drawer marks required (it
  // also requires State; v2 never has, and this is not the place to widen
  // it). Their * comes from `required(...)` below; see components/form.
  return (
    <form.AppForm>
      <form.Form className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-5">
          <form.AppField name="legalName" validators={{ onChange: rules(required("Legal name")) }}>
            {(field) => (
              <field.TextField
                inputClassName="shadow-none"
                id="biller-legal-name"
                label="Legal name"
              />
            )}
          </form.AppField>

          <form.AppField name="gstIn">
            {(field) => (
              <field.TextField
                inputClassName="shadow-none"
                id="biller-gstin"
                label="GSTIN"
                placeholder="Optional"
                parse={(raw) => raw.toUpperCase()}
              />
            )}
          </form.AppField>

          <form.AppField
            name="streetAddress1"
            validators={{ onChange: rules(required("Address")) }}
          >
            {(field) => (
              <field.TextField inputClassName="shadow-none" id="biller-street1" label="Address" />
            )}
          </form.AppField>

          <form.AppField name="streetAddress2">
            {(field) => (
              <field.TextField
                inputClassName="shadow-none"
                id="biller-street2"
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
            <form.AppField name="country">
              {(field) => (
                <field.SingleSelectField
                  id="biller-country"
                  label="Country"
                  options={countryOptions}
                  placeholder="Select country"
                  searchPlaceholder="Search country…"
                  emptyText="No country matches that search."
                  // See AddAddressDialog's twin of this line.
                  onValueChange={() => form.setFieldValue("state", "")}
                />
              )}
            </form.AppField>

            {/* A select over the whole state list, which is what production's
                biller form offers (EditBillerDetails maps every key of
                stateCodes into its own select, ungated by country — its form has
                no country field at all). Searchable because the list is long
                enough that scrolling a listbox is not reasonable. */}
            <form.AppField name="state">
              {(field) => (
                <field.SingleSelectField
                  id="biller-state"
                  label="State"
                  options={stateOptions}
                  placeholder="Select state"
                  searchPlaceholder="Search state…"
                  emptyText="No state matches that search."
                />
              )}
            </form.AppField>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <form.AppField name="city" validators={{ onChange: rules(required("City")) }}>
              {(field) => (
                <field.TextField inputClassName="shadow-none" id="biller-city" label="City" />
              )}
            </form.AppField>

            <form.AppField name="zipcode" validators={{ onChange: rules(required("Zipcode")) }}>
              {(field) => (
                <field.TextField inputClassName="shadow-none" id="biller-zip" label="Zipcode" />
              )}
            </form.AppField>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <form.AppField
              name="email"
              validators={{ onChange: rules(required("Primary contact email")) }}
            >
              {(field) => (
                <field.TextField
                  inputClassName="shadow-none"
                  id="biller-email"
                  type="email"
                  label="Primary contact email"
                />
              )}
            </form.AppField>

            <form.AppField
              name="phone"
              validators={{ onChange: rules(required("Primary contact number")) }}
            >
              {(field) => (
                <field.TextField
                  inputClassName="shadow-none"
                  id="biller-phone"
                  inputMode="tel"
                  label="Primary contact number"
                />
              )}
            </form.AppField>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <form.SubmitButton>Save</form.SubmitButton>
        </div>
      </form.Form>
    </form.AppForm>
  );
}
