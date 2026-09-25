"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useStore } from "@tanstack/react-form";
import {
  Accordion,
  Button,
  Checkbox,
  CountrySelect,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  StatusBadge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { RequiredMark } from "@/features/dashboard/sku-management/components/item-form/FormSection";
import {
  CollapsibleEditorSection,
  EditorSection,
} from "@/features/dashboard/payment-button/components/create/EditorSection";
import { CheckoutPreview } from "@/features/dashboard/payment-button/components/create/CheckoutPreview";
import { GetCodeDialog } from "@/features/dashboard/payment-button/components/create/GetCodeDialog";
import { ButtonLiveDialog } from "@/features/dashboard/payment-button/components/create/ButtonLiveDialog";
import { usePost } from "@/lib/api/hooks";
import { createPaymentButtonApi } from "@/features/dashboard/payment-button/services";
import { CurrencyValueField } from "@/features/dashboard/payment-button/components/create/CurrencyValueField";
import { CustomisationFields } from "@/features/dashboard/payment-button/components/create/CustomisationFields";
import {
  validateContactEmail,
  validatePhone,
} from "@/features/dashboard/client-management/schemas";
import {
  buildLiveEmbedLines,
  copyEmbedCode,
  displayDomain,
  embedLinesToText,
  toCreatePaymentButtonBody,
} from "@/features/dashboard/payment-button/helpers";
import {
  PAYMENT_BUTTONS_QUERY_KEY,
  useMerchantCurrencies,
  useMerchantWebsite,
  usePaymentButtonCreateScope,
  usePaymentButtonsEnabled,
} from "@/features/dashboard/payment-button/hooks";
import { PaymentButtonNotEnabled } from "@/features/dashboard/payment-button/components/PaymentButtonNotEnabled";
import { MidGuard } from "@/components/common/MidGuard";
import { SelectMidView } from "@/components/common/SelectMidView";
import {
  validateButtonAmount,
  validateButtonLabel,
  validateCustomFieldDefault,
  validateCustomFieldLabel,
} from "@/features/dashboard/payment-button/schemas";
import {
  CUSTOM_FIELDS_HINT,
  DEFAULT_VALUE_HINT,
  EMPTY_PAYMENT_BUTTON_FORM,
  MAX_CUSTOM_FIELDS,
  PAYMENT_BUTTON_CUSTOM_FIELD_TYPES,
  PAYMENT_BUTTONS_FEATURE,
  emptyCustomField,
  PAYMENT_BUTTON_AMOUNT_TYPES,
  PAYMENT_BUTTON_COLLECT_FIELDS,
} from "@/features/dashboard/payment-button/constants";
import type {
  CreatePaymentButtonBody,
  CreatePaymentButtonResponse,
  PaymentButtonAmountType,
  PaymentButtonScript,
  PaymentButtonCustomFieldType,
} from "@/features/dashboard/payment-button/types";

/**
 * An info glyph with a tip. A real Button so it opens by keyboard too; not
 * IconButton, whose native `title` would pop up beside the tooltip (see the
 * Month header on the receipts table, which this copies).
 */
function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            aria-label={label}
            className="h-4 w-4 min-h-0 shrink-0 rounded-full p-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
          >
            <Icon name="info" className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[240px]">{children}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * One custom field's group of controls. From the second field on, a divider
 * separates it from the one above and a remove control sits at its top right;
 * the first stays bare, as the design draws it, since a list of one has
 * nothing to separate and the section's own checkbox is how it goes away.
 */
function CustomFieldBlock({
  index,
  canRemove,
  onRemove,
  children,
}: {
  index: number;
  canRemove: boolean;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      {index > 0 && <Separator />}
      {canRemove && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-muted-foreground">Field {index + 1}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Remove field ${index + 1}`}
            className="h-7 w-7 min-h-0 min-w-0 rounded-md p-0 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <Icon name="trash-2" className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      {children}
    </div>
  );
}

/** One Contact us line: its glyph in a fixed gutter, the field beside it. */
function ContactRow({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon name={icon} className="mt-3 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/**
 * Create a payment button, at /payment-button/create.
 *
 * A full-screen editor in the (invoice-editor) route group, laid out exactly as
 * Create Invoice: a header carrying close, title, draft state and the primary
 * action, then the form on the left and a live preview on a muted pane to the
 * right. The preview reads the form store directly, so it follows every
 * keystroke without the form re-rendering through a parent.
 *
 * Create posts pg-dashboard's own contract (toCreatePaymentButtonBody): currency,
 * website, and the email/phone switches. BACKEND GAP: label, amount type,
 * amount, name/billing address, custom fields, contact details and appearance
 * have no field in it yet, so they are collected and previewed but not sent.
 *
 * Get code and Copy code stay disabled until create returns the button's
 * script: before that there is no working snippet to give (no button id, and
 * the script URL comes from the response), and a merchant could paste a
 * placeholder into their site. After create both use buildLiveEmbedLines.
 */
function CreatePaymentButtonEditor({ mid }: { mid: string }) {
  const router = useRouter();
  const { currencies } = useMerchantCurrencies(mid);
  const website = useMerchantWebsite(mid);

  const [getCodeOpen, setGetCodeOpen] = useState(false);
  // Set once create succeeds; its presence is what opens the live dialog.
  const [created, setCreated] = useState<PaymentButtonScript | null>(null);

  // Plain JSON, no encryption, exactly as pg-dashboard posts it. Refreshes the
  // list on success, so the new button is there when Done returns to it.
  const { mutate: createButton, isPending: isCreating } = usePost<
    CreatePaymentButtonResponse,
    CreatePaymentButtonBody
  >(createPaymentButtonApi(mid), { invalidateQueries: [[...PAYMENT_BUTTONS_QUERY_KEY]] });

  const form = useForm({
    defaultValues: EMPTY_PAYMENT_BUTTON_FORM,
    onSubmit: ({ value }) => {
      createButton(toCreatePaymentButtonBody(value, website), {
        onSuccess: (res) => {
          if (res?.data) setCreated(res.data);
          else toast.error("Failed to create payment button");
        },
        onError: (error) => toast.error(error.message || "Failed to create payment button"),
      });
    },
  });
  const values = useStore(form.store, (s) => s.values);

  const embedLines = created ? buildLiveEmbedLines(created) : [];

  const close = () => router.push("/payment-button");

  return (
    // No shadows anywhere in the editor (cards, inputs, buttons, the preview):
    // one descendant rule instead of a shadow-none on every component. Focus
    // rings are unaffected, Tailwind keeps them on a separate shadow layer.
    <div className="flex h-full flex-col [&_*]:shadow-none">
      <header className="flex shrink-0 flex-wrap items-center gap-4 border-b border-border px-5 py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Close"
          className="h-9 w-9 shrink-0 p-0"
          onClick={close}
        >
          <Icon name="x" className="h-4 w-4" />
        </Button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Create a new payment button
            </h1>
            <StatusBadge variant="muted" label="Draft" size="sm" />
            {/* TODO: design copy; there is no draft endpoint behind it yet. */}
            <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
              <Icon name="refresh" className="h-3 w-3" />
              Auto-saved as you type
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          leftIcon={<Icon name="send" className="h-3.5 w-3.5" />}
          isLoading={isCreating}
          disabled={isCreating || !!created}
          onClick={() => void form.handleSubmit()}
        >
          Create button
        </Button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* ── Form ─────────────────────────────────────────────────────── */}
        {/* `relative` is load-bearing. Inside a <form>, Radix Checkbox and
            Select each render a hidden native input with position:absolute.
            With no positioned ancestor those resolve against the document, so
            the ones far down this pane stretched the page past the viewport and
            the body scrolled, sliding the whole editor up and leaving blank
            space beneath it. Positioning the scroll pane keeps them inside it. */}
        <div className="relative min-h-0 overflow-y-auto">
          <form
            className="mx-auto max-w-250 space-y-5 px-6 py-6 lg:px-8"
            onSubmit={(e) => {
              e.preventDefault();
              void form.handleSubmit();
            }}
          >
            <EditorSection
              icon="mouse-pointer-click"
              title="Button Details"
              description="Customers will see this button to initiate a transaction"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="payment-button-id">Button ID</FieldLabel>
                  {/* Issued by the backend on create (the `pbId` it returns),
                      so there is nothing to show or type before then. */}
                  <Input
                    id="payment-button-id"
                    disabled
                    value={created?.pbId ?? ""}
                    placeholder="Assigned on create"
                    className="font-mono shadow-none"
                  />
                  <FieldDescription>For dashboard use, not visible to customers</FieldDescription>
                </Field>

                <form.Field
                  name="label"
                  validators={{
                    onBlur: ({ value }) => validateButtonLabel(value),
                    onSubmit: ({ value }) => validateButtonLabel(value),
                  }}
                >
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="payment-button-label">
                        Button Label <RequiredMark />
                      </FieldLabel>
                      <Input
                        id="payment-button-label"
                        placeholder="Pay Now"
                        aria-invalid={field.state.meta.errors.length > 0}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        className="shadow-none"
                      />
                      {field.state.meta.errors.length > 0 ? (
                        <FieldError>{field.state.meta.errors[0]}</FieldError>
                      ) : (
                        <FieldDescription>This label is shown to your customers</FieldDescription>
                      )}
                    </Field>
                  )}
                </form.Field>
              </div>
            </EditorSection>

            <EditorSection
              icon="credit-card"
              title="What you'll be collecting"
              description="Collected from the customer on the payment page after they click the button"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <form.Field name="amountType">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="payment-button-amount-type">Amount</FieldLabel>
                      <Select
                        value={field.state.value}
                        onValueChange={(next) => {
                          field.handleChange(next as PaymentButtonAmountType);
                          // A switch back to Customer Decides drops the typed
                          // amount, so it can't resurface as a stale value.
                          if (next === "CUSTOMER_DECIDES") form.setFieldValue("amount", "");
                        }}
                      >
                        <SelectTrigger id="payment-button-amount-type" className="shadow-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_BUTTON_AMOUNT_TYPES.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <span className="flex items-center gap-2">
                                <Icon
                                  name={option.icon}
                                  className="h-3.5 w-3.5 text-muted-foreground"
                                />
                                {option.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                </form.Field>

                <form.Field
                  name="amount"
                  validators={{
                    onSubmit: ({ value, fieldApi }) =>
                      validateButtonAmount(
                        value,
                        fieldApi.form.getFieldValue("amountType") === "FIXED"
                      ),
                  }}
                >
                  {(field) => {
                    const isFixed = values.amountType === "FIXED";
                    return (
                      <Field>
                        <FieldLabel htmlFor="payment-button-amount">Value</FieldLabel>
                        <CurrencyValueField
                          id="payment-button-amount"
                          currency={values.currency}
                          amount={field.state.value}
                          currencies={currencies}
                          onCurrencyChange={(currency) => form.setFieldValue("currency", currency)}
                          onAmountChange={field.handleChange}
                          disabled={!isFixed}
                          placeholder={isFixed ? "0.00" : "To be filled by customer"}
                          invalid={field.state.meta.errors.length > 0}
                        />
                        <FieldError>{field.state.meta.errors[0]}</FieldError>
                      </Field>
                    );
                  }}
                </form.Field>
              </div>

              <div className="flex flex-col gap-3">
                {PAYMENT_BUTTON_COLLECT_FIELDS.map((option) => (
                  <form.Field key={option.key} name={`collect.${option.key}`}>
                    {(field) => (
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`payment-button-collect-${option.key}`}
                          checked={field.state.value}
                          onCheckedChange={(next) => field.handleChange(next === true)}
                        />
                        <Label
                          htmlFor={`payment-button-collect-${option.key}`}
                          className="flex cursor-pointer items-center gap-2.5 text-[14px] font-normal text-foreground"
                        >
                          <Icon name={option.icon} className="h-4 w-4 text-muted-foreground" />
                          {option.label}
                        </Label>
                      </div>
                    )}
                  </form.Field>
                ))}
              </div>
            </EditorSection>

            <Accordion type="single" collapsible>
              <CollapsibleEditorSection
                value="advanced"
                icon="sliders-horizontal"
                title="Advanced options"
              >
                <form.Field name="customFieldsEnabled">
                  {(field) => (
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="payment-button-custom-fields"
                        checked={field.state.value}
                        onCheckedChange={(next) => field.handleChange(next === true)}
                        size="lg"
                      />
                      <Label
                        htmlFor="payment-button-custom-fields"
                        className="cursor-pointer text-[14px] font-semibold text-foreground"
                      >
                        Add custom fields
                      </Label>
                      <InfoTip label="About custom fields">{CUSTOM_FIELDS_HINT}</InfoTip>
                    </div>
                  )}
                </form.Field>

                {values.customFieldsEnabled && (
                  <form.Field name="customFields" mode="array">
                    {(listField) => (
                      <div className="flex flex-col gap-4 pl-9">
                        {listField.state.value.map((customField, index) => (
                          <CustomFieldBlock
                            key={customField.id}
                            index={index}
                            canRemove={listField.state.value.length > 1}
                            onRemove={() => listField.removeValue(index)}
                          >
                            <div className="grid gap-2 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
                              <form.Field name={`customFields[${index}].type`}>
                                {(field) => (
                                  <Select
                                    value={field.state.value}
                                    onValueChange={(next) =>
                                      field.handleChange(next as PaymentButtonCustomFieldType)
                                    }
                                  >
                                    <SelectTrigger
                                      aria-label={`Field ${index + 1} type`}
                                      className="shadow-none"
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {PAYMENT_BUTTON_CUSTOM_FIELD_TYPES.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </form.Field>
                              <form.Field
                                name={`customFields[${index}].label`}
                                validators={{
                                  onBlur: ({ value }) => validateCustomFieldLabel(value),
                                  onSubmit: ({ value, fieldApi }) =>
                                    fieldApi.form.getFieldValue("customFieldsEnabled")
                                      ? validateCustomFieldLabel(value)
                                      : undefined,
                                }}
                              >
                                {(field) => (
                                  <Field>
                                    <Input
                                      aria-label={`Field ${index + 1} label`}
                                      placeholder="Label name"
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

                            <form.Field name={`customFields[${index}].hasDefault`}>
                              {(field) => (
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    id={`${customField.id}-has-default`}
                                    checked={field.state.value}
                                    onCheckedChange={(next) => field.handleChange(next === true)}
                                    size="lg"
                                  />
                                  <Label
                                    htmlFor={`${customField.id}-has-default`}
                                    className="cursor-pointer text-[14px] font-semibold text-foreground"
                                  >
                                    Set a default value
                                  </Label>
                                  <InfoTip label="About default values">
                                    {DEFAULT_VALUE_HINT}
                                  </InfoTip>
                                </div>
                              )}
                            </form.Field>

                            {customField.hasDefault && (
                              <form.Field
                                name={`customFields[${index}].defaultValue`}
                                validators={{
                                  onBlur: ({ value }) => validateCustomFieldDefault(value),
                                  onSubmit: ({ value, fieldApi }) =>
                                    fieldApi.form.getFieldValue("customFieldsEnabled") &&
                                    fieldApi.form.getFieldValue(`customFields[${index}].hasDefault`)
                                      ? validateCustomFieldDefault(value)
                                      : undefined,
                                }}
                              >
                                {(field) => (
                                  <Field className="pl-9">
                                    <Input
                                      aria-label={`Field ${index + 1} default value`}
                                      placeholder="Default value"
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
                            )}

                            <form.Field name={`customFields[${index}].optional`}>
                              {(field) => (
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    id={`${customField.id}-optional`}
                                    checked={field.state.value}
                                    onCheckedChange={(next) => field.handleChange(next === true)}
                                    size="lg"
                                  />
                                  <Label
                                    htmlFor={`${customField.id}-optional`}
                                    className="cursor-pointer text-[14px] font-semibold text-foreground"
                                  >
                                    Mark as optional
                                  </Label>
                                </div>
                              )}
                            </form.Field>
                          </CustomFieldBlock>
                        ))}

                        {listField.state.value.length < MAX_CUSTOM_FIELDS && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
                            // The id is minted here, in the handler, never during render.
                            onClick={() =>
                              listField.pushValue(emptyCustomField(crypto.randomUUID()))
                            }
                            className="w-fit rounded-full border-dashed border-primary/50 text-primary hover:bg-primary/5 hover:text-primary"
                          >
                            Add another field
                          </Button>
                        )}
                      </div>
                    )}
                  </form.Field>
                )}

                <Separator />

                {/* Always on: every button shows the merchant's support details
                    to the payer. Drawn as a ticked, locked checkbox so it still
                    reads as one of the options, just not an optional one. */}
                <div className="flex items-center gap-3">
                  <Checkbox id="payment-button-contact" checked disabled size="lg" />
                  <Label
                    htmlFor="payment-button-contact"
                    className="text-[14px] font-semibold text-foreground"
                  >
                    Contact us
                  </Label>
                </div>

                <div className="flex flex-col gap-3 pl-9">
                  <form.Field
                    name="contact.email"
                    validators={{
                      onBlur: ({ value }) => validateContactEmail(value),
                      onSubmit: ({ value }) => validateContactEmail(value),
                    }}
                  >
                    {(field) => (
                      <ContactRow icon="mail">
                        <Field>
                          <Input
                            aria-label="Support email"
                            type="email"
                            placeholder="support@yourcompany.com"
                            aria-invalid={field.state.meta.errors.length > 0}
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            className="shadow-none"
                          />
                          <FieldError>{field.state.meta.errors[0]}</FieldError>
                        </Field>
                      </ContactRow>
                    )}
                  </form.Field>

                  {/* Dial code and number are one field, sharing a row and a
                        single error, exactly as the Add client form draws its
                        contact number. */}
                  <form.Field
                    name="contact.phoneNumber"
                    validators={{
                      onBlur: ({ value, fieldApi }) =>
                        validatePhone(fieldApi.form.getFieldValue("contact.phoneCountry"), value),
                      onSubmit: ({ value, fieldApi }) =>
                        validatePhone(fieldApi.form.getFieldValue("contact.phoneCountry"), value),
                    }}
                  >
                    {(field) => (
                      <ContactRow icon="phone">
                        <Field>
                          <div className="grid gap-2 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)]">
                            <form.Field name="contact.phoneCountry">
                              {(countryField) => (
                                <CountrySelect
                                  value={countryField.state.value}
                                  onValueChange={(code) => {
                                    countryField.handleChange(code);
                                    form.validateField("contact.phoneNumber", "blur");
                                  }}
                                  showDialCode
                                  placeholder="Code"
                                  className="shadow-none"
                                />
                              )}
                            </form.Field>
                            <Input
                              aria-label="Support phone number"
                              type="tel"
                              inputMode="tel"
                              placeholder="Enter phone number"
                              aria-invalid={field.state.meta.errors.length > 0}
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              onBlur={field.handleBlur}
                              className="shadow-none"
                            />
                          </div>
                          <FieldError>{field.state.meta.errors[0]}</FieldError>
                        </Field>
                      </ContactRow>
                    )}
                  </form.Field>

                  {/* The website pg-dashboard sends as `webDomain`, read from
                        the merchant profile and read-only there too. */}
                  <ContactRow icon="globe">
                    <Input
                      aria-label="Website"
                      disabled
                      value={displayDomain(website)}
                      placeholder="No website on file"
                      className="shadow-none"
                    />
                  </ContactRow>
                </div>
              </CollapsibleEditorSection>
            </Accordion>
          </form>
        </div>

        {/* ── Preview ──────────────────────────────────────────────────── */}
        <div className="relative min-h-0 overflow-y-auto bg-muted">
          <div className="space-y-4 p-4 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Preview
                </h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  How your button will look on a checkout page
                </p>
              </div>
              <div className="flex items-center gap-2">
                <NeedsCreatedButton ready={!!created}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!created}
                    leftIcon={<Icon name="code" className="h-3.5 w-3.5" />}
                    onClick={() => setGetCodeOpen(true)}
                  >
                    Get code
                  </Button>
                </NeedsCreatedButton>
                <NeedsCreatedButton ready={!!created}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!created}
                    leftIcon={<Icon name="copy" className="h-3.5 w-3.5" />}
                    onClick={() => void copyEmbedCode(embedLinesToText(embedLines))}
                  >
                    Copy code
                  </Button>
                </NeedsCreatedButton>
              </div>
            </div>

            <CheckoutPreview values={values} website={website} />

            <Accordion type="single" collapsible>
              <CollapsibleEditorSection
                value="customisation"
                icon="palette"
                title="Customisation"
                description="Fine-tune how the button looks"
              >
                <CustomisationFields
                  value={values.appearance}
                  onChange={(patch) =>
                    form.setFieldValue("appearance", { ...values.appearance, ...patch })
                  }
                />
              </CollapsibleEditorSection>
            </Accordion>
          </div>
        </div>
      </div>

      <GetCodeDialog open={getCodeOpen} onOpenChange={setGetCodeOpen} lines={embedLines} />
      <ButtonLiveDialog
        open={!!created}
        label={values.label.trim() || "Pay Now"}
        lines={embedLines}
        onDone={close}
      />
    </div>
  );
}

/**
 * Explains why a code action is unavailable while it is. A disabled button
 * takes no pointer events, so the tip hangs off a focusable wrapper; once the
 * button exists the wrapper steps aside and the button is used directly.
 */
function NeedsCreatedButton({ ready, children }: { ready: boolean; children: ReactNode }) {
  if (ready) return <>{children}</>;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>{children}</span>
        </TooltipTrigger>
        <TooltipContent>Available once the button is created</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * The editor's header and a centred body, for the states that stop short of
 * the form: product not enabled, MID not eligible, or an account to pick. Close
 * works from all of them, as it does from the editor.
 */
function EditorGateShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  return (
    <div className="flex h-full flex-col [&_*]:shadow-none">
      <header className="flex shrink-0 items-center gap-4 border-b border-border px-5 py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Close"
          className="h-9 w-9 shrink-0 p-0"
          onClick={() => router.push("/payment-button")}
        >
          <Icon name="x" className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Create a new payment button
        </h1>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto bg-muted p-4 md:p-6">
        <div className="mx-auto mt-6 max-w-xl">{children}</div>
      </div>
    </div>
  );
}

/**
 * Create a payment button, at /payment-button/create: the same gates as the
 * list page, then the editor under a resolved MID.
 *
 *  1. The PAYMENT_BUTTONS product must be enabled (else the not-enabled state).
 *  2. A MID selected in the header must be PA and carry the feature (MidGuard).
 *  3. The MID to create under must be known: from `?mid=` (the list's picker),
 *     the header's selection, or the only eligible MID. A merchant with several
 *     and none chosen, arriving from the header search or a bare link, picks
 *     here first, the way pg-dashboard's Create asks before opening its form.
 */
export function CreatePaymentButtonFeature() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEnabled = usePaymentButtonsEnabled();
  const { mid, needsMidChoice, midOptions } = usePaymentButtonCreateScope(searchParams.get("mid"));

  if (!isEnabled) {
    return (
      <EditorGateShell>
        <PaymentButtonNotEnabled className="rounded-xl border border-border bg-card" />
      </EditorGateShell>
    );
  }

  if (needsMidChoice || !mid) {
    return (
      <EditorGateShell>
        <MidGuard productType="PA" feature={PAYMENT_BUTTONS_FEATURE}>
          <SelectMidView
            midType="PA"
            midOptions={midOptions}
            onSelectMid={(choice) =>
              router.replace(`/payment-button/create?mid=${encodeURIComponent(choice)}`)
            }
            showSidebarHint={false}
          />
        </MidGuard>
      </EditorGateShell>
    );
  }

  return (
    <MidGuard productType="PA" feature={PAYMENT_BUTTONS_FEATURE}>
      {/* Keyed by MID: switching accounts starts a fresh form, since
          currencies and the website are per MID. */}
      <CreatePaymentButtonEditor key={mid} mid={mid} />
    </MidGuard>
  );
}
