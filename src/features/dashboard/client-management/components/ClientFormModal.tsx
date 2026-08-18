"use client";

import { useRef, useState, type ReactNode } from "react";
import { useForm } from "@tanstack/react-form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
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
import { ClientBusinessTypeChips } from "@/features/dashboard/client-management/components/ClientBusinessTypeChips";
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

/**
 * Which sections start expanded. The modal remounts its body every time it
 * opens (see the `key` below), so these are the sections open on arrival every
 * time, not just the first — the three that carry required fields. The other
 * three are all-optional and start collapsed, keeping the form short enough to
 * take in at a glance while leaving them one click away.
 *
 * Collapsing a section unmounts its fields, which is safe: TanStack Form keeps
 * values in the form store rather than in the field components, so a collapsed
 * section's values survive and are still submitted.
 */
const DEFAULT_OPEN_SECTIONS = ["business", "contact", "address"];

/**
 * One titled, collapsible group of fields, as its own bordered container: a
 * tinted header band carrying the title and the chevron, and — once expanded —
 * the fields directly beneath it inside the same rounded box, divided from the
 * header by a single hairline. Collapsed, the container is just that header, so
 * a closed section shows its title and nothing else: no labels, no inputs, no
 * values.
 *
 * Three details worth naming:
 *
 * - `last:border-b` cancels AccordionItem's own `last:border-b-0`, which exists
 *   for the stacked-rows accordion this no longer is; without it the final
 *   container would lose its bottom edge.
 * - `overflow-hidden` is what makes the header band and the content beneath it
 *   respect the container's rounded corners.
 * - The padding lives on an inner div rather than on AccordionContent, because
 *   flux passes that component's className to both its animated outer box and
 *   its inner one, and layout utilities belong only on the inner.
 */
function FormSection({
  value,
  title,
  children,
}: {
  value: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <AccordionItem
      value={value}
      className="overflow-hidden rounded-xl border border-border bg-card last:border-b"
    >
      <AccordionTrigger className="bg-muted/40 px-4 py-3 text-[14px] font-semibold text-foreground">
        {title}
      </AccordionTrigger>
      <AccordionContent className="pb-0">
        <div className="flex flex-col gap-3 border-t border-border px-4 py-4">{children}</div>
      </AccordionContent>
    </AccordionItem>
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
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-1">
        {/* type="multiple" so the open sections are independent — opening
            Contract must not collapse Address the way a single-value accordion
            would. gap-3 between the containers: each already draws its own
            border, so this only needs to keep them from touching, not to stand
            in for a divider. */}
        <Accordion
          type="multiple"
          defaultValue={DEFAULT_OPEN_SECTIONS}
          className="flex flex-col gap-3 py-2"
        >
          {/* ── Business information ─────────────────────────────────────── */}
          <FormSection value="business" title="Business information">
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

            {/* Chips, not a dropdown: five short options are cheaper to read
                on screen than behind a trigger, and the row folds onto a
                second line at narrow widths rather than needing one. */}
            <form.Field
              name="businessType"
              validators={{
                onChange: ({ value }) => validateBusinessType(value),
                onSubmit: ({ value }) => validateBusinessType(value),
              }}
            >
              {(field) => {
                const invalid = field.state.meta.errors.length > 0;
                return (
                  <Field invalid={invalid}>
                    {/* No htmlFor: the control is a group of checkboxes rather
                        than one input, so the group points back at this label
                        with aria-labelledby instead. */}
                    <FieldLabel id="client-business-type-label">
                      <RequiredMark /> Business type
                    </FieldLabel>
                    <ClientBusinessTypeChips
                      id="client-business-type"
                      labelledBy="client-business-type-label"
                      options={CLIENT_BUSINESS_TYPES}
                      value={field.state.value}
                      onChange={field.handleChange}
                      invalid={invalid}
                    />
                    <FieldError>{field.state.meta.errors[0]}</FieldError>
                  </Field>
                );
              }}
            </form.Field>

            {/* Full width and on its own line, after the two fields that
                identify the business — optional, and the least consequential
                thing in the section. */}
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
          <FormSection value="contact" title="Primary contact">
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

          {/* ── Address ──────────────────────────────────────────────────────
              Laid out as the reference's address block: the street address
              across the full width, the two fields that qualify a city on one
              row beneath it, then the postcode. Country leads, since it is the
              field the others are read against — a state and a postcode only
              mean something once you know which country they belong to — and
              it is the one the reference has no slot for.

              Every paired row is `grid gap-3 sm:grid-cols-2`, the same as the
              Primary contact section's: two columns from sm up, one below it,
              so the fields stack in this same order on a phone and nothing ever
              scrolls sideways. Spacing between the groups is the section's own
              flex gap-3 — no rules or separators. */}
          <FormSection value="address" title="Address">
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
          </FormSection>

          {/* ── Tax information ──────────────────────────────────────────── */}
          <FormSection value="tax" title="GST (Optional)">
            <form.Field name="gstin">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="client-gstin">GSTIN (Optional)</FieldLabel>
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
          <FormSection value="notes" title="Additional information (Optional)">
            <form.Field name="notes">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="client-notes">Notes (Optional)</FieldLabel>
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
          <FormSection value="contract" title="Contract (Optional)">
            <form.Field name="contract">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="client-contract">Contract (Optional)</FieldLabel>
                  <ClientContractUpload
                    id="client-contract"
                    value={field.state.value}
                    onChange={field.handleChange}
                  />
                </Field>
              )}
            </form.Field>
          </FormSection>
        </Accordion>
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
