"use client";

import { useRef, useState, type ReactNode } from "react";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { Icon } from "@/components/icon";

import { useForm } from "@tanstack/react-form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  COUNTRIES,
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
  Checkbox,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Shimmer,
  Textarea,
  useBreakpoint,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { CLIENT_BUSINESS_TYPES } from "@/features/dashboard/client-management/constants";
import {
  useClientStateCodes,
  useClientTagOptions,
} from "@/features/dashboard/client-management/hooks";
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
/**
 * flux's country list, shaped for SearchableSelect. Module scope because
 * COUNTRIES is a constant — there is nothing to recompute per render.
 */
const countrySelectOptions = COUNTRIES.map((country) => ({
  value: country.code,
  label: `${country.flag} ${country.name}`,
}));

/** The state endpoint returns names in upper case ("KARNATAKA"). Title-cased for
 *  display only — the value submitted is the name exactly as it arrived. */
function getStateLabel(name: string): string {
  return name
    .toLowerCase()
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function RequiredMark() {
  return (
    <span aria-hidden className="text-destructive">
      *
    </span>
  );
}

/**
 * "+ Add website", "+ Add tags", "+ Add shipping address"… — the trigger for
 * an all-optional field or section that starts collapsed. Primary-tinted
 * text with no fill or border of its own (same undecorated treatment
 * Create Invoice's own "Add due date" chip uses for the same reason: it
 * marks something still to do without drawing a whole second field style
 * into the form).
 */
function AddOptionalTrigger({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-fit items-center gap-1.5 py-0.5 text-[13px] font-medium text-primary transition-colors hover:text-primary-hover"
    >
      <Icon name="plus" className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

/**
 * Wraps a revealed optional field or section: its own content, plus a
 * delete affordance that only appears on hover (or focus, for keyboard
 * users) rather than sitting on screen permanently — removing it clears the
 * value(s) and collapses back to the field's own AddOptionalTrigger.
 */
function OptionalFieldSlot({
  removeLabel,
  onRemove,
  children,
}: {
  removeLabel: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className="group/optional relative">
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className={cn(
          "absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground",
          "opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35",
          "group-hover/optional:opacity-100"
        )}
      >
        <Icon name="x" className="h-3.5 w-3.5" />
      </button>
    </div>
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
  /** "add" (default) or "edit" — the field model is identical, so this only
   *  changes the wording and which values the form opens on. */
  mode?: "add" | "edit";
  /** The id of the record being edited. Identity only — it keys the form body, so
   *  reopening on a different client mounts a fresh form. Absent in add mode. */
  recordId?: string;
  /** Pre-filled values for edit mode. Undefined opens a blank form. */
  initialValues?: ClientFormValues;
  /** True while the record those values come from is still being fetched, which
   *  holds the modal in a loading state rather than mounting the form on partial
   *  values. See ClientTable's by-id fetch. */
  isLoading?: boolean;
  /** Called with validated values. `keepOpen` distinguishes Add client from
   *  Save and add another, so the caller doesn't need two callbacks. */
  onSubmit: (values: ClientFormValues, keepOpen: boolean) => void;
  /** Opens the contract stored against the client being edited. Undefined in add
   *  mode, and for an edited client that has none. */
  onViewStoredContract?: () => void;
  /** Deletes that stored contract server-side. */
  onRemoveStoredContract?: () => void;
  /** Merchant id to fetch tag suggestions under, when the caller resolves its MID
   *  differently from the client-management page (which reads it off the URL).
   *  The create-invoice flow does — it uses the selected MID with the first PACB
   *  MID as a fallback — and pg-dashboard threads the same override into this
   *  form for the same reason, as `selectedMidForAddClient`. */
  midOverride?: string;
}

export function ClientFormModal({
  open,
  onOpenChange,
  mode = "add",
  recordId,
  initialValues,
  isLoading = false,
  onSubmit,
  onViewStoredContract,
  onRemoveStoredContract,
  midOverride,
}: ClientFormModalProps) {
  const { isMobile } = useBreakpoint();

  // Announced by the Dialog/Drawer on open, and the heading the loading state
  // shows before the form itself is mounted.
  const modalTitle = mode === "edit" ? "Edit client" : "Add client";

  const body = isLoading ? (
    // The record the form will be built from is still in flight (see
    // ClientTable's by-id fetch). The body is withheld rather than mounted on
    // partial values, so the form is seeded exactly once, from the whole record —
    // pg-dashboard shows the same loading state on its own drawer for the same
    // reason. Shimmer rather than a spinner, so the modal keeps the shape of the
    // form that is about to appear in it.
    <div className="flex min-h-0 flex-col" aria-busy>
      <div className="flex-shrink-0 border-b border-border px-5 py-4">
        <h2 className="text-[16px] font-semibold tracking-tight text-foreground">{modalTitle}</h2>
      </div>
      <div className="min-h-0 flex-1 space-y-4 px-5 py-5">
        <span className="sr-only" role="status">
          Loading client details
        </span>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Shimmer className="h-3 w-24 rounded" />
            <Shimmer className="h-9 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  ) : (
    <ClientFormBody
      // Remounts the form whenever the modal opens on a different client (or
      // reopens on a blank one), which is what discards a previous session's
      // half-typed values and validation state. Cheaper and harder to get wrong
      // than resetting every field in an effect.
      //
      // Keyed on the record's id, not its business name: two clients can share a
      // name, and the id is what actually says "this is a different record". It
      // also means the key does not change when the fetched record replaces
      // nothing — the body only ever mounts once the values are final.
      key={open ? `open-${mode}-${recordId ?? "new"}` : "closed"}
      mode={mode}
      initialValues={initialValues}
      onCancel={() => onOpenChange(false)}
      onSubmit={onSubmit}
      onViewStoredContract={onViewStoredContract}
      onRemoveStoredContract={onRemoveStoredContract}
      midOverride={midOverride}
    />
  );

  // Drawer on mobile, Dialog above it — the same responsive modal pairing the
  // Add item form uses, so a form sheet behaves the same wherever it appears.
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} side="bottom">
        <DrawerContent className="flex max-h-[90vh] flex-col rounded-t-2xl p-0">
          <DrawerTitle className="sr-only">{modalTitle}</DrawerTitle>
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
        <DialogTitle className="sr-only">{modalTitle}</DialogTitle>
        {body}
      </DialogContent>
    </Dialog>
  );
}

function ClientFormBody({
  mode,
  initialValues,
  onCancel,
  onSubmit,
  onViewStoredContract,
  onRemoveStoredContract,
  midOverride,
}: {
  mode: "add" | "edit";
  initialValues?: ClientFormValues;
  onCancel: () => void;
  onSubmit: (values: ClientFormValues, keepOpen: boolean) => void;
  onViewStoredContract?: () => void;
  onRemoveStoredContract?: () => void;
  midOverride?: string;
}) {
  // Which button started the submit. A ref, not state: it's read inside the
  // submit handler in the same tick it's written, and re-rendering on it would
  // be pointless.
  const isEdit = mode === "edit";
  const title = isEdit ? "Edit client" : "Add client";

  const keepOpenRef = useRef(false);
  // Cancel with typed-in values asks first; an untouched form just closes.
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  // The address country, which decides what the State select can offer. Held
  // alongside the form (rather than read inside the field) because the state
  // options have to change the moment the country does.
  const [addressCountry, setAddressCountry] = useState(initialValues?.country ?? "");

  // Whether each all-optional field/section is revealed. Lifted here (rather
  // than useState inside a form.Field render prop, which would break the
  // rules of hooks) and seeded from whatever the record already has, so
  // editing a client with a website already filled in doesn't hide it
  // behind an "+ Add website" the merchant would have to know to click.
  const [websiteOpen, setWebsiteOpen] = useState(!!initialValues?.website);
  const [tagsOpen, setTagsOpen] = useState(!!initialValues?.tags?.length);
  const [shippingOpen, setShippingOpen] = useState(
    !!initialValues && !initialValues.sameAsBillingAddress
  );
  const [gstOpen, setGstOpen] = useState(!!initialValues?.gstin);
  const [notesOpen, setNotesOpen] = useState(!!initialValues?.notes);
  const [contractOpen, setContractOpen] = useState(!!initialValues?.contract);

  // Tag suggestions and the state list are merchant/app configuration rather
  // than constants, so both are fetched (see useClientTagOptions and
  // useClientStateCodes).
  const { tags: tagSuggestions } = useClientTagOptions(midOverride);
  const { states } = useClientStateCodes();

  // India has a state list; nothing else does, so every other country gets the
  // single "Not Applicable" option — the value pg-dashboard's own form submits
  // for a non-India address.
  const stateOptions =
    addressCountry === "IN"
      ? states.map((name) => ({ value: name, label: getStateLabel(name) }))
      : [{ value: "OTHER COUNTRY", label: "Not Applicable" }];

  const form = useForm({
    defaultValues: initialValues ?? emptyClientForm(),
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
        <h2 className="text-[16px] font-semibold tracking-tight text-foreground">{title}</h2>
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
                    className="shadow-none"
                  />
                  <FieldError>{field.state.meta.errors[0]}</FieldError>
                </Field>
              )}
            </form.Field>

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
                    <FieldLabel htmlFor="client-business-type">
                      <RequiredMark /> Business type
                    </FieldLabel>
                    <Select value={field.state.value} onValueChange={field.handleChange}>
                      <SelectTrigger
                        id="client-business-type"
                        aria-invalid={invalid}
                        className="shadow-none"
                      >
                        <SelectValue placeholder="Select business type" />
                      </SelectTrigger>
                      <SelectContent>
                        {CLIENT_BUSINESS_TYPES.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError>{field.state.meta.errors[0]}</FieldError>
                  </Field>
                );
              }}
            </form.Field>

            {/* Optional, and the least consequential thing in the section —
                starts as a plain "+ Add website" link rather than an empty
                field, and only turns into one once clicked. */}
            <form.Field
              name="website"
              validators={{
                onBlur: ({ value }) => validateWebsite(value),
                onSubmit: ({ value }) => validateWebsite(value),
              }}
            >
              {(field) =>
                websiteOpen ? (
                  <OptionalFieldSlot
                    removeLabel="Remove website"
                    onRemove={() => {
                      field.handleChange("");
                      setWebsiteOpen(false);
                    }}
                  >
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
                        className="shadow-none"
                      />
                      <FieldError>{field.state.meta.errors[0]}</FieldError>
                    </Field>
                  </OptionalFieldSlot>
                ) : (
                  <AddOptionalTrigger label="Add website" onClick={() => setWebsiteOpen(true)} />
                )
              }
            </form.Field>

            <form.Field name="tags">
              {(field) =>
                tagsOpen ? (
                  <OptionalFieldSlot
                    removeLabel="Remove tags"
                    onRemove={() => {
                      field.handleChange([]);
                      setTagsOpen(false);
                    }}
                  >
                    <Field>
                      <FieldLabel htmlFor="client-tags">Tags</FieldLabel>
                      <ClientTagsInput
                        id="client-tags"
                        value={field.state.value}
                        onChange={field.handleChange}
                        suggestions={tagSuggestions}
                      />
                    </Field>
                  </OptionalFieldSlot>
                ) : (
                  <AddOptionalTrigger label="Add tags" onClick={() => setTagsOpen(true)} />
                )
              }
            </form.Field>
          </FormSection>

          {/* ── Primary contact ──────────────────────────────────────────── */}
          <FormSection value="contact" title="Primary contact">
            {/* For a sole trader the contact and the business are the same name,
                and typing it twice is busywork. Ticked, the field below collapses
                and the business name is submitted as the contact name too (see
                toClientApiPayload). */}
            <form.Field name="sameAsBusinessName">
              {(field) => (
                <label className="mb-3 flex w-fit items-center gap-2 text-[13px] text-muted-foreground">
                  <Checkbox
                    id="client-same-as-business"
                    checked={field.state.value}
                    onCheckedChange={(checked) => field.handleChange(checked === true)}
                  />
                  Contact name is the same as the business name
                </label>
              )}
            </form.Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <form.Subscribe selector={(state) => state.values.sameAsBusinessName}>
                {(sameAsBusinessName) =>
                  sameAsBusinessName ? null : (
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
                            className="shadow-none"
                          />
                          <FieldError>{field.state.meta.errors[0]}</FieldError>
                        </Field>
                      )}
                    </form.Field>
                  )
                }
              </form.Subscribe>

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
                      className="shadow-none"
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
                          className="shadow-none"
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
                      className="shadow-none"
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
                  {/* SearchableSelect rather than flux's CountrySelect, for one
                      reason: CountrySelect builds its own Radix Popover with no
                      `modal` prop, and a non-modal popover portalled out of a
                      modal Dialog cannot be scrolled — react-remove-scroll
                      cancels the wheel. Options are built from flux's own
                      exported COUNTRIES, so the values are the same ISO codes
                      and the flag still shows; only the scroll behaviour
                      changes. Revert this the day CountrySelect takes `modal`. */}
                  <SearchableSelect
                    id="client-country"
                    value={field.state.value}
                    options={countrySelectOptions}
                    onValueChange={(code) => {
                      field.handleChange(code);
                      setAddressCountry(code);
                      // The previously chosen state belongs to the old country's
                      // list, so it is cleared rather than left showing a value
                      // the select no longer offers.
                      form.setFieldValue("state", "");
                      // A blank phone country is almost always the same country
                      // as the address, so the first country chosen seeds it —
                      // never overwriting a code already picked.
                      if (!form.getFieldValue("phoneCountry") && dialCodeFor(code)) {
                        form.setFieldValue("phoneCountry", code);
                      }
                    }}
                    placeholder="Select country"
                    searchPlaceholder="Search country…"
                    emptyMessage="No country matches that search."
                    invalid={field.state.meta.errors.length > 0}
                    className="shadow-none"
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
                    className="shadow-none"
                  />
                  <FieldError>{field.state.meta.errors[0]}</FieldError>
                </Field>
              )}
            </form.Field>

            {/* Second line, optional — the API's address has always had it and
                this form used to send it empty. */}
            <form.Field name="addressLine2">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="client-address-2">Address line 2</FieldLabel>
                  <Input
                    id="client-address-2"
                    placeholder="Apartment, suite, floor (optional)"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className="shadow-none"
                  />
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
                      className="shadow-none"
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
                    {/* Searchable, matching the Country field above it. The
                        list is fetched (useClientStateCodes) and covers India
                        only, which is why every other country collapses to the
                        single "Not Applicable" option — exactly as
                        pg-dashboard's own client form does, and why the search
                        box hides itself below a handful of options.

                        A plain Select here meant the only way to reach Karnataka
                        was scrolling or Radix's type-ahead, and type-ahead lands
                        on the first DOM match: "k" gave Kerala. */}
                    <SearchableSelect
                      id="client-state"
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value)}
                      options={stateOptions}
                      placeholder="Select state"
                      searchPlaceholder="Search state…"
                      emptyMessage="No state matches that search."
                      invalid={field.state.meta.errors.length > 0}
                      className="shadow-none"
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
                    className="shadow-none"
                  />
                  <FieldError>{field.state.meta.errors[0]}</FieldError>
                </Field>
              )}
            </form.Field>
          </FormSection>
        </Accordion>

        {/* ── The rest: all-optional, no card/accordion of their own ──────
            Same "+ Add X" pattern as Website/Tags above — each starts as a
            plain trigger and only becomes a field (or, for Shipping, a
            group of them) once clicked, with the delete-on-hover affordance
            taking the place of the accordion's own always-visible chevron
            header. Plain space-y rhythm rather than each in its own bordered
            container, now that there's no card left to draw a border
            around. */}
        <div className="space-y-4 py-3">
          {/* ── Shipping address ───────────────────────────────────────── */}
          {shippingOpen ? (
            <OptionalFieldSlot
              removeLabel="Remove shipping address"
              onRemove={() => {
                form.setFieldValue("sameAsBillingAddress", true);
                form.setFieldValue("shippingCountry", "");
                form.setFieldValue("shippingAddressLine", "");
                form.setFieldValue("shippingAddressLine2", "");
                form.setFieldValue("shippingCity", "");
                form.setFieldValue("shippingState", "");
                form.setFieldValue("shippingZipcode", "");
                setShippingOpen(false);
              }}
            >
              <div className="space-y-3">
                <p className="text-[13px] font-semibold text-foreground">Shipping address</p>

                <form.Field name="shippingCountry">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="client-shipping-country">Country</FieldLabel>
                      {/* The same country control the billing address uses,
                          and independent of it: a client can be billed in one
                          country and shipped to in another. */}
                      <CountrySelect
                        value={field.state.value}
                        onValueChange={(code) => field.handleChange(code)}
                        placeholder="Select country"
                        className="shadow-none"
                      />
                    </Field>
                  )}
                </form.Field>

                <form.Field name="shippingAddressLine">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="client-shipping-address">Address</FieldLabel>
                      <Textarea
                        id="client-shipping-address"
                        rows={2}
                        placeholder="Enter street address"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        className="shadow-none"
                      />
                    </Field>
                  )}
                </form.Field>

                <form.Field name="shippingAddressLine2">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="client-shipping-address-2">Address line 2</FieldLabel>
                      <Input
                        id="client-shipping-address-2"
                        placeholder="Apartment, suite, floor (optional)"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        className="shadow-none"
                      />
                    </Field>
                  )}
                </form.Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <form.Field name="shippingCity">
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor="client-shipping-city">City</FieldLabel>
                        <Input
                          id="client-shipping-city"
                          placeholder="Enter city"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          className="shadow-none"
                        />
                      </Field>
                    )}
                  </form.Field>

                  <form.Field name="shippingState">
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor="client-shipping-state">State</FieldLabel>
                        {/* Free text, unlike the billing state's select: the
                            state endpoint only covers India, and the shipping
                            country is independent — so a select here would be
                            empty for most of the countries this field exists
                            to serve. */}
                        <Input
                          id="client-shipping-state"
                          placeholder="Enter state"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          className="shadow-none"
                        />
                      </Field>
                    )}
                  </form.Field>
                </div>

                <form.Field name="shippingZipcode">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="client-shipping-zipcode">Zipcode</FieldLabel>
                      <Input
                        id="client-shipping-zipcode"
                        placeholder="Enter zipcode"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        className="shadow-none"
                      />
                    </Field>
                  )}
                </form.Field>
              </div>
            </OptionalFieldSlot>
          ) : (
            <AddOptionalTrigger
              label="Add shipping address"
              onClick={() => {
                // Opening this is a deliberate "ship somewhere else" choice,
                // so it un-ticks the billing-address copy the same way
                // unchecking the old checkbox did — the fields below are
                // about to hold a real, different address.
                form.setFieldValue("sameAsBillingAddress", false);
                setShippingOpen(true);
              }}
            />
          )}

          {/* ── GST ───────────────────────────────────────────────────── */}
          <form.Field name="gstin">
            {(field) =>
              gstOpen ? (
                <OptionalFieldSlot
                  removeLabel="Remove GSTIN"
                  onRemove={() => {
                    field.handleChange("");
                    setGstOpen(false);
                  }}
                >
                  <Field>
                    <FieldLabel htmlFor="client-gstin">GSTIN</FieldLabel>
                    <Input
                      id="client-gstin"
                      placeholder="Enter GSTIN"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="shadow-none"
                    />
                  </Field>
                </OptionalFieldSlot>
              ) : (
                <AddOptionalTrigger label="Add GST" onClick={() => setGstOpen(true)} />
              )
            }
          </form.Field>

          {/* ── Additional information ───────────────────────────────── */}
          <form.Field name="notes">
            {(field) =>
              notesOpen ? (
                <OptionalFieldSlot
                  removeLabel="Remove notes"
                  onRemove={() => {
                    field.handleChange("");
                    setNotesOpen(false);
                  }}
                >
                  <Field>
                    <FieldLabel htmlFor="client-notes">Notes</FieldLabel>
                    <Textarea
                      id="client-notes"
                      rows={3}
                      placeholder="Add notes about this client"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="shadow-none"
                    />
                  </Field>
                </OptionalFieldSlot>
              ) : (
                <AddOptionalTrigger label="Add notes" onClick={() => setNotesOpen(true)} />
              )
            }
          </form.Field>

          {/* ── Contract ──────────────────────────────────────────────── */}
          <form.Field name="contract">
            {(field) =>
              contractOpen ? (
                <OptionalFieldSlot
                  removeLabel="Remove contract"
                  onRemove={() => {
                    // Only clears this session's local pick — a contract the
                    // server already holds is removed through the component's
                    // own "Remove" action (onRemoveStored below), which also
                    // calls the API. This just collapses the section back.
                    field.handleChange(null);
                    setContractOpen(false);
                  }}
                >
                  <Field>
                    <FieldLabel htmlFor="client-contract">Contract</FieldLabel>
                    <ClientContractUpload
                      id="client-contract"
                      value={field.state.value}
                      onChange={field.handleChange}
                      // Only for a contract the server holds — a file picked in
                      // this session has nothing to view and nothing to delete
                      // remotely. `file` being absent is what distinguishes them.
                      onViewStored={
                        field.state.value && !field.state.value.file
                          ? onViewStoredContract
                          : undefined
                      }
                      onRemoveStored={
                        field.state.value && !field.state.value.file
                          ? onRemoveStoredContract
                          : undefined
                      }
                    />
                  </Field>
                </OptionalFieldSlot>
              ) : (
                <AddOptionalTrigger label="Add contract" onClick={() => setContractOpen(true)} />
              )
            }
          </form.Field>
        </div>
      </div>

      {/* ── Actions ──────────────────────────────────────────────────────
          In add mode, Save and add another sits opposite the pair as a
          link-style action, so it reads as a secondary route through the same
          form rather than a third button competing with the primary CTA — the
          same arrangement as the Add item form's footer.

          In edit mode it is not rendered at all: "another" has no meaning when
          the form is open on one existing record, and the action would either
          have to save the edit and then open a blank Add form (a different task
          the merchant did not ask for) or duplicate the client. Nothing to
          disable, so nothing is shown. justify-end then pulls the remaining pair
          to the right, where they sit in every other single-action footer. */}
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3.5">
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
          {isEdit ? "Update client" : "Add client"}
        </Button>
      </div>
    </form>
  );
}
