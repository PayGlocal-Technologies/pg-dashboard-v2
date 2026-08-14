"use client";

import { useRef, useState, type ReactNode } from "react";
import { useForm } from "@tanstack/react-form";
import {
  Button,
  CountrySelect,
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
  Separator,
  Textarea,
  useBreakpoint,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { CLIENT_BUSINESS_TYPES } from "@/features/dashboard/client-management/constants";
import {
  dialCodeFor,
  emptyClientForm,
  isClientFormDirty,
  validateAddress,
  validateBusinessName,
  validateBusinessType,
  validateCity,
  validateContactEmail,
  validateContactName,
  validateCountry,
  validatePhone,
  validateState,
  validateWebsite,
  validateZipcode,
} from "@/features/dashboard/client-management/schemas";
import { ClientTagsInput } from "@/features/dashboard/client-management/components/ClientTagsInput";
import { ClientContractUpload } from "@/features/dashboard/client-management/components/ClientContractUpload";
import type { ClientFormValues } from "@/features/dashboard/client-management/types";

/** Red asterisk before a required field's label — the same marker the Add item
 *  form uses, so required-ness reads identically across the product. */
function RequiredMark() {
  return (
    <span aria-hidden className="text-destructive">
      *
    </span>
  );
}

/** Trailing "Optional" note on a label, for the two sections that are lighter
 *  than the required ones above them. */
function OptionalMark() {
  return <span className="ml-1 text-[11px] font-normal text-muted-foreground">Optional</span>;
}

/** One titled group of fields. Proximity and a rule do the grouping rather
 *  than a card per section, which would make a form this long read as eight
 *  stacked panels. */
function FormSection({
  title,
  children,
  withDivider = true,
}: {
  title: string;
  children: ReactNode;
  withDivider?: boolean;
}) {
  return (
    <>
      {withDivider && <Separator />}
      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
          {title}
        </p>
        {children}
      </div>
    </>
  );
}

interface ClientFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with validated values. `keepOpen` distinguishes Add client from
   *  Save and add another, so the caller doesn't need two callbacks. */
  onSubmit: (values: ClientFormValues, keepOpen: boolean) => void;
}

export function ClientFormModal({ open, onOpenChange, onSubmit }: ClientFormModalProps) {
  const { isMobile } = useBreakpoint();

  const body = (
    <ClientFormBody
      // Remounts the form each time the modal opens, which is what discards a
      // previous session's half-typed values and validation state. Cheaper and
      // harder to get wrong than resetting every field in an effect.
      key={open ? "open" : "closed"}
      onCancel={() => onOpenChange(false)}
      onSubmit={onSubmit}
    />
  );

  // Drawer on mobile, Dialog above it — the same responsive modal pairing the
  // Add item form uses, so a form sheet behaves the same wherever it appears.
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
      {/* Exactly the Add item dialog's width (w-[min(100%-1.5rem,34rem)]), so
          the two form modals open at the same size rather than this one being
          the odd width in the product. The paired fields still sit two across
          inside it; the form just runs taller, which the scrolling middle band
          below already absorbs. */}
      <DialogContent
        className={cn(
          "flex max-h-[min(90vh,52rem)] w-[min(100%-1.5rem,34rem)] max-w-none flex-col",
          "gap-0 overflow-hidden rounded-2xl p-0"
        )}
      >
        <DialogTitle className="sr-only">Add client</DialogTitle>
        {body}
      </DialogContent>
    </Dialog>
  );
}

function ClientFormBody({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (values: ClientFormValues, keepOpen: boolean) => void;
}) {
  // Which button started the submit. A ref, not state: it's read inside the
  // submit handler in the same tick it's written, and re-rendering on it would
  // be pointless.
  const keepOpenRef = useRef(false);
  // Cancel with typed-in values asks first; an untouched form just closes.
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const form = useForm({
    defaultValues: emptyClientForm(),
    onSubmit: ({ value, formApi }) => {
      onSubmit(value, keepOpenRef.current);
      if (keepOpenRef.current) {
        // Save and add another: back to a blank form, ready to type into.
        formApi.reset(emptyClientForm());
      }
    },
  });

  const submitWith = (keepOpen: boolean) => {
    keepOpenRef.current = keepOpen;
    void form.handleSubmit();
  };

  const handleCancel = () => {
    if (isClientFormDirty(form.state.values) && !confirmingDiscard) {
      setConfirmingDiscard(true);
      return;
    }
    onCancel();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submitWith(false);
      }}
      className="flex min-h-0 flex-col"
      noValidate
    >
      {/* Header — the Dialog/Drawer's own close button sits at the top right,
          so the title row only carries the title. */}
      <div className="flex-shrink-0 border-b border-border px-5 py-4">
        <h2 className="text-[16px] font-semibold tracking-tight text-foreground">Add client</h2>
      </div>

      {/* Only this middle band scrolls, so the footer actions stay reachable
          however tall the form runs. */}
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
        {/* ── Business information ─────────────────────────────────────── */}
        <FormSection title="Business information" withDivider={false}>
          <form.Field
            name="businessName"
            validators={{
              onBlur: ({ value }) => validateBusinessName(value),
              onSubmit: ({ value }) => validateBusinessName(value),
            }}
          >
            {(field) => (
              <Field>
                <FieldLabel htmlFor="client-business-name">
                  <RequiredMark /> Business name
                </FieldLabel>
                <Input
                  id="client-business-name"
                  placeholder="Enter business name"
                  aria-invalid={field.state.meta.errors.length > 0}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                <FieldError>{field.state.meta.errors[0]}</FieldError>
              </Field>
            )}
          </form.Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <form.Field
              name="businessType"
              validators={{
                onChange: ({ value }) => validateBusinessType(value),
                onSubmit: ({ value }) => validateBusinessType(value),
              }}
            >
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="client-business-type">
                    <RequiredMark /> Business type
                  </FieldLabel>
                  <Select value={field.state.value} onValueChange={field.handleChange}>
                    <SelectTrigger
                      id="client-business-type"
                      aria-invalid={field.state.meta.errors.length > 0}
                      className="w-full"
                    >
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLIENT_BUSINESS_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError>{field.state.meta.errors[0]}</FieldError>
                </Field>
              )}
            </form.Field>

            <form.Field
              name="website"
              validators={{
                onBlur: ({ value }) => validateWebsite(value),
                onSubmit: ({ value }) => validateWebsite(value),
              }}
            >
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="client-website">Website</FieldLabel>
                  <Input
                    id="client-website"
                    inputMode="url"
                    placeholder="https://example.com"
                    aria-invalid={field.state.meta.errors.length > 0}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  <FieldError>{field.state.meta.errors[0]}</FieldError>
                </Field>
              )}
            </form.Field>
          </div>

          <form.Field name="tags">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="client-tags">Tags</FieldLabel>
                <ClientTagsInput
                  id="client-tags"
                  value={field.state.value}
                  onChange={field.handleChange}
                />
              </Field>
            )}
          </form.Field>
        </FormSection>

        {/* ── Primary contact ──────────────────────────────────────────── */}
        <FormSection title="Primary contact">
          <div className="grid gap-3 sm:grid-cols-2">
            <form.Field
              name="primaryContactName"
              validators={{
                onBlur: ({ value }) => validateContactName(value),
                onSubmit: ({ value }) => validateContactName(value),
              }}
            >
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="client-contact-name">
                    <RequiredMark /> Primary contact name
                  </FieldLabel>
                  <Input
                    id="client-contact-name"
                    placeholder="Enter contact name"
                    aria-invalid={field.state.meta.errors.length > 0}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  <FieldError>{field.state.meta.errors[0]}</FieldError>
                </Field>
              )}
            </form.Field>

            <form.Field
              name="primaryContactEmail"
              validators={{
                onBlur: ({ value }) => validateContactEmail(value),
                onSubmit: ({ value }) => validateContactEmail(value),
              }}
            >
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="client-contact-email">
                    <RequiredMark /> Primary contact email
                  </FieldLabel>
                  <Input
                    id="client-contact-email"
                    type="email"
                    placeholder="name@company.com"
                    aria-invalid={field.state.meta.errors.length > 0}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  <FieldError>{field.state.meta.errors[0]}</FieldError>
                </Field>
              )}
            </form.Field>
          </div>

          {/* Dial code and number are one field to the person filling this in,
              so they share a row and a single error message — the country
              picker below is only there to supply the code, which is how the
              record stores it (phoneDialCode + phoneNumber). */}
          <form.Field
            name="phoneNumber"
            validators={{
              onBlur: ({ value }) => validatePhone(form.getFieldValue("phoneCountry"), value),
              onSubmit: ({ value }) => validatePhone(form.getFieldValue("phoneCountry"), value),
            }}
          >
            {(field) => (
              <Field>
                <FieldLabel htmlFor="client-phone-number">
                  <RequiredMark /> Primary contact number
                </FieldLabel>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
                  <form.Field name="phoneCountry">
                    {(countryField) => (
                      <CountrySelect
                        value={countryField.state.value}
                        onValueChange={(code) => {
                          countryField.handleChange(code);
                          // The number's validity depends on this, so its error
                          // is re-evaluated here rather than waiting for
                          // another blur on the number field.
                          form.validateField("phoneNumber", "blur");
                        }}
                        showDialCode
                        placeholder="Code"
                      />
                    )}
                  </form.Field>
                  <Input
                    id="client-phone-number"
                    type="tel"
                    inputMode="tel"
                    placeholder="Enter contact number"
                    aria-invalid={field.state.meta.errors.length > 0}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </div>
                <FieldError>{field.state.meta.errors[0]}</FieldError>
              </Field>
            )}
          </form.Field>
        </FormSection>

        {/* ── Address ──────────────────────────────────────────────────── */}
        <FormSection title="Address">
          <div className="grid gap-3 sm:grid-cols-2">
            <form.Field
              name="country"
              validators={{
                onChange: ({ value }) => validateCountry(value),
                onSubmit: ({ value }) => validateCountry(value),
              }}
            >
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="client-country">
                    <RequiredMark /> Country
                  </FieldLabel>
                  <CountrySelect
                    value={field.state.value}
                    onValueChange={(code) => {
                      field.handleChange(code);
                      // A blank phone country is almost always the same country
                      // as the address, so the first country chosen seeds it —
                      // never overwriting a code already picked.
                      if (!form.getFieldValue("phoneCountry") && dialCodeFor(code)) {
                        form.setFieldValue("phoneCountry", code);
                      }
                    }}
                    placeholder="Select country"
                  />
                  <FieldError>{field.state.meta.errors[0]}</FieldError>
                </Field>
              )}
            </form.Field>

            <form.Field
              name="state"
              validators={{
                onBlur: ({ value }) => validateState(value),
                onSubmit: ({ value }) => validateState(value),
              }}
            >
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="client-state">
                    <RequiredMark /> State
                  </FieldLabel>
                  {/* A text input rather than a select: a country-by-country
                      list of states/provinces is data this app doesn't hold,
                      and an empty select for the countries it lacks would be
                      worse than a field that always accepts the right answer. */}
                  <Input
                    id="client-state"
                    placeholder="Enter state"
                    aria-invalid={field.state.meta.errors.length > 0}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  <FieldError>{field.state.meta.errors[0]}</FieldError>
                </Field>
              )}
            </form.Field>
          </div>

          <form.Field
            name="addressLine"
            validators={{
              onBlur: ({ value }) => validateAddress(value),
              onSubmit: ({ value }) => validateAddress(value),
            }}
          >
            {(field) => (
              <Field>
                <FieldLabel htmlFor="client-address">
                  <RequiredMark /> Address
                </FieldLabel>
                <Textarea
                  id="client-address"
                  rows={2}
                  placeholder="Enter street address"
                  aria-invalid={field.state.meta.errors.length > 0}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                <FieldError>{field.state.meta.errors[0]}</FieldError>
              </Field>
            )}
          </form.Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <form.Field
              name="city"
              validators={{
                onBlur: ({ value }) => validateCity(value),
                onSubmit: ({ value }) => validateCity(value),
              }}
            >
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="client-city">
                    <RequiredMark /> City
                  </FieldLabel>
                  <Input
                    id="client-city"
                    placeholder="Enter city"
                    aria-invalid={field.state.meta.errors.length > 0}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  <FieldError>{field.state.meta.errors[0]}</FieldError>
                </Field>
              )}
            </form.Field>

            <form.Field
              name="zipcode"
              validators={{
                onBlur: ({ value }) => validateZipcode(value),
                onSubmit: ({ value }) => validateZipcode(value),
              }}
            >
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="client-zipcode">
                    <RequiredMark /> Zipcode
                  </FieldLabel>
                  {/* Not type="number": postcodes are alphanumeric in half the
                      world (SW1A 1AA, K1P 5Z9), so this stays a text field. */}
                  <Input
                    id="client-zipcode"
                    placeholder="Enter zipcode"
                    aria-invalid={field.state.meta.errors.length > 0}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  <FieldError>{field.state.meta.errors[0]}</FieldError>
                </Field>
              )}
            </form.Field>
          </div>
        </FormSection>

        {/* ── Tax information ──────────────────────────────────────────── */}
        <FormSection title="Tax information">
          <form.Field name="gstin">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="client-gstin">
                  GSTIN
                  <OptionalMark />
                </FieldLabel>
                <Input
                  id="client-gstin"
                  placeholder="Enter GSTIN"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </Field>
            )}
          </form.Field>
        </FormSection>

        {/* ── Additional information ───────────────────────────────────── */}
        <FormSection title="Additional information">
          <form.Field name="notes">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="client-notes">
                  Notes
                  <OptionalMark />
                </FieldLabel>
                <Textarea
                  id="client-notes"
                  rows={3}
                  placeholder="Add notes about this client"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </Field>
            )}
          </form.Field>
        </FormSection>

        {/* ── Contract ─────────────────────────────────────────────────── */}
        <FormSection title="Contract">
          <form.Field name="contract">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="client-contract">
                  Contract
                  <OptionalMark />
                </FieldLabel>
                <ClientContractUpload
                  id="client-contract"
                  value={field.state.value}
                  onChange={field.handleChange}
                />
              </Field>
            )}
          </form.Field>
        </FormSection>
      </div>

      {/* ── Actions ──────────────────────────────────────────────────────
          Save and add another sits opposite the pair, as a link-style action,
          so it reads as a secondary route through the same form rather than a
          third button competing with the primary CTA — same arrangement as the
          Add item form's footer. */}
      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3.5">
        <Button
          type="button"
          variant="link"
          size="sm"
          className="px-0"
          onClick={() => submitWith(true)}
        >
          Save and add another
        </Button>

        <div className="flex items-center gap-2">
          {/* Cancel turns into its own confirmation once the form has been
              typed into: one more click discards, and moving away from it (or
              typing again) is not needed to undo, since nothing has been
              thrown away yet. */}
          <Button
            type="button"
            variant={confirmingDiscard ? "danger" : "outline"}
            size="sm"
            onClick={handleCancel}
          >
            {confirmingDiscard ? "Discard changes?" : "Cancel"}
          </Button>
          <Button type="submit" variant="primary" size="sm">
            Add client
          </Button>
        </div>
      </div>
    </form>
  );
}
