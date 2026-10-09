"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
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
  TooltipTrigger,
  Dialog,
  DialogContent,
  DialogTitle,
  Shimmer,
  VisuallyHidden,
} from "@/components/ui";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { Icon, type IconName } from "@/components/icon";
import { cn } from "@/lib/utils";
import { RequiredMark } from "@/components/common/RequiredMark";
import {
  CollapsibleEditorSection,
  EditorSection,
} from "@/features/dashboard/payment-button/components/create/EditorSection";
import { CheckoutPreview } from "@/features/dashboard/payment-button/components/create/CheckoutPreview";
import { GetCodeDialog } from "@/features/dashboard/payment-button/components/create/GetCodeDialog";
import { ButtonLiveDialog } from "@/features/dashboard/payment-button/components/create/ButtonLiveDialog";
import { usePost, usePut } from "@/lib/api/hooks";
import {
  createPaymentButtonApi,
  paymentButtonApi,
} from "@/features/dashboard/payment-button/services";
import {
  CurrencySelect,
  CurrencyValueField,
} from "@/features/dashboard/payment-button/components/create/CurrencyValueField";
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
  useMerchantCurrencies,
  useMerchantWebsite,
  usePaymentButtonConfig,
  useRefreshListAfterWrite,
} from "@/features/dashboard/payment-button/hooks";
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
  emptyCustomField,
  PAYMENT_BUTTON_AMOUNT_TYPES,
  PAYMENT_BUTTON_COLLECT_FIELDS,
  DESIGN_ONLY_FIELDS_ENABLED,
} from "@/features/dashboard/payment-button/constants";
import type {
  CreatePaymentButtonBody,
  CreatePaymentButtonResponse,
  PaymentButtonAmountType,
  PaymentButtonConfig,
  PaymentButtonEditTarget,
  PaymentButtonFormValues,
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
 * The create-a-payment-button editor, shown in CreatePaymentButtonDialog: a
 * header carrying close, title and the primary action, then the form. With
 * DESIGN_ONLY_FIELDS_ENABLED it also draws the design's live preview on a muted
 * pane to the right, which reads the form store directly.
 *
 * Create posts pg-dashboard's own contract (toCreatePaymentButtonBody): currency,
 * website, and the email/phone switches. Label, amount type, amount,
 * name/billing address, custom fields, contact details and appearance have no
 * field in it, so they are hidden behind DESIGN_ONLY_FIELDS_ENABLED.
 *
 * Get code and Copy code stay disabled until create returns the button's
 * script: before that there is no working snippet to give (no button id, and
 * the script URL comes from the response), and a merchant could paste a
 * placeholder into their site. After create both use buildLiveEmbedLines.
 */
function CreatePaymentButtonEditor({
  mid,
  onClose,
  onCreated,
  edit,
}: {
  mid: string;
  onClose: () => void;
  /** The new button's script and label, for the "button is live" dialog,
   *  which the modal shows in place of this editor. Create only. */
  onCreated?: (script: PaymentButtonScript, label: string) => void;
  /** Edit an existing button instead of creating one: the form starts from
   *  its saved settings and saves with a PUT (pg-dashboard's
   *  EditPaymentButton). Get code / Copy code belong to create and are hidden. */
  edit?: { buttonId: string; config: PaymentButtonConfig };
}) {
  const { currencies } = useMerchantCurrencies(mid);
  const profileWebsite = useMerchantWebsite(mid);
  // Editing keeps the website the button was saved with, falling back to the
  // profile's (the field is read-only either way).
  const website = edit?.config.webDomain || profileWebsite;

  const [getCodeOpen, setGetCodeOpen] = useState(false);
  // Set once create succeeds; its presence is what opens the live dialog.
  const [created, setCreated] = useState<PaymentButtonScript | null>(null);

  // Plain JSON, no encryption, exactly as pg-dashboard posts it. Refreshes the
  // list on success, so the new button is there when Done returns to it.
  const { mutate: createButton, isPending: isCreating } = usePost<
    CreatePaymentButtonResponse,
    CreatePaymentButtonBody
  >(createPaymentButtonApi(mid), { invalidateQueries: false });
  // Same body as create, PUT to the button itself.
  const { mutate: saveButton, isPending: isSaving } = usePut<unknown, CreatePaymentButtonBody>(
    edit ? paymentButtonApi(mid, edit.buttonId) : "",
    { invalidateQueries: false }
  );
  // The list is refetched once the search index has the new button (an
  // immediate refetch would come back without it); see SEARCH_INDEX_LAG_MS.
  const refreshList = useRefreshListAfterWrite();

  const form = useForm({
    defaultValues: edit ? formValuesFromConfig(edit.config) : EMPTY_PAYMENT_BUTTON_FORM,
    onSubmit: ({ value }) => {
      if (edit) {
        saveButton(toCreatePaymentButtonBody(value, website), {
          onSuccess: () => {
            toast.success("Payment button updated");
            refreshList();
            onClose();
          },
          onError: (error) => toast.error(error.message || "Failed to update payment button"),
        });
        return;
      }
      createButton(toCreatePaymentButtonBody(value, website), {
        onSuccess: (res) => {
          refreshList();
          if (res?.data) {
            setCreated(res.data);
            onCreated?.(res.data, value.label.trim() || "Pay Now");
          } else toast.error("Failed to create payment button");
        },
        onError: (error) => toast.error(error.message || "Failed to create payment button"),
      });
    },
  });
  const values = useStore(form.store, (s) => s.values);

  const embedLines = created ? buildLiveEmbedLines(created) : [];

  const close = onClose;

  // Get code and Copy code, in the design's preview header only. Without the
  // preview there is nothing to offer before create, and after it the "button
  // is live" dialog takes over with the code and its own Copy.
  const codeActions = (
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
  );

  return (
    // No shadows anywhere in the editor (cards, inputs, buttons, the preview):
    // one descendant rule instead of a shadow-none on every component. Focus
    // rings are unaffected, Tailwind keeps them on a separate shadow layer.
    <div className="flex h-full min-h-0 flex-col [&_*]:shadow-none">
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
              {edit ? "Edit payment button" : "Create a new payment button"}
            </h1>
            {edit && (
              <span className="font-mono text-[13px] text-muted-foreground">{edit.buttonId}</span>
            )}
            {/* No draft endpoint and no auto-save behind these (see
                DESIGN_ONLY_FIELDS_ENABLED). */}
            {DESIGN_ONLY_FIELDS_ENABLED && (
              <>
                <StatusBadge variant="muted" label="Draft" size="sm" />
                <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
                  <Icon name="refresh" className="h-3 w-3" />
                  Auto-saved as you type
                </span>
              </>
            )}
          </div>
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          leftIcon={<Icon name={edit ? "check" : "send"} className="h-3.5 w-3.5" />}
          isLoading={isCreating || isSaving}
          disabled={isCreating || isSaving || !!created}
          onClick={() => void form.handleSubmit()}
        >
          {edit ? "Save changes" : "Create button"}
        </Button>
      </header>

      <div
        className={cn(
          "grid min-h-0 flex-1 grid-cols-1",
          DESIGN_ONLY_FIELDS_ENABLED && "lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
        )}
      >
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
            {/* Button Details only holds the button label, which create does
                not send (see DESIGN_ONLY_FIELDS_ENABLED). The id is issued on
                create, and an edited button's id is in the header. */}
            {DESIGN_ONLY_FIELDS_ENABLED && (
              <EditorSection
                icon="mouse-pointer-click"
                title="Button Details"
                description="Customers will see this button to initiate a transaction"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* The button label is not sent on create (see DESIGN_ONLY_FIELDS_ENABLED). */}
                  {DESIGN_ONLY_FIELDS_ENABLED && (
                    <>
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
                              Button Label <RequiredMark placement="after" />
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
                              <FieldDescription>
                                This label is shown to your customers
                              </FieldDescription>
                            )}
                          </Field>
                        )}
                      </form.Field>
                    </>
                  )}
                </div>
              </EditorSection>
            )}

            <EditorSection
              icon="credit-card"
              title="What you'll be collecting"
              description="Collected from the customer on the payment page after they click the button"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Amount type and value are not sent on create, only the
                    currency is (iso3CurrencyCode); see
                    DESIGN_ONLY_FIELDS_ENABLED. */}
                {DESIGN_ONLY_FIELDS_ENABLED ? (
                  <>
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
                              onCurrencyChange={(currency) =>
                                form.setFieldValue("currency", currency)
                              }
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
                  </>
                ) : (
                  <form.Field name="currency">
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor="payment-button-currency">Currency</FieldLabel>
                        <CurrencySelect
                          id="payment-button-currency"
                          value={field.state.value}
                          currencies={currencies}
                          onValueChange={field.handleChange}
                        />
                      </Field>
                    )}
                  </form.Field>
                )}

                {/* The website pg-dashboard sends as `webDomain`, read from the
                    merchant profile and read-only there too. */}
                <Field>
                  <FieldLabel htmlFor="payment-button-website">Website</FieldLabel>
                  <Input
                    id="payment-button-website"
                    disabled
                    value={displayDomain(website)}
                    placeholder="No website on file"
                    className="shadow-none"
                  />
                </Field>
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

            {/* Everything under Advanced options is design-only (see
                DESIGN_ONLY_FIELDS_ENABLED); the website it held is above. */}
            {DESIGN_ONLY_FIELDS_ENABLED && (
              <Accordion type="single" collapsible>
                <CollapsibleEditorSection
                  value="advanced"
                  icon="sliders-horizontal"
                  title="Advanced options"
                >
                  {/* Custom fields are not sent on create (see DESIGN_ONLY_FIELDS_ENABLED). */}
                  {DESIGN_ONLY_FIELDS_ENABLED && (
                    <>
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
                                          onCheckedChange={(next) =>
                                            field.handleChange(next === true)
                                          }
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
                                          fieldApi.form.getFieldValue(
                                            `customFields[${index}].hasDefault`
                                          )
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
                                          onCheckedChange={(next) =>
                                            field.handleChange(next === true)
                                          }
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
                    </>
                  )}
                  {/* The merchant contact details are not sent on create (see DESIGN_ONLY_FIELDS_ENABLED). */}
                  {DESIGN_ONLY_FIELDS_ENABLED && (
                    <>
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
                    </>
                  )}
                  <div className="flex flex-col gap-3 pl-9">
                    {/* The merchant contact details are not sent on create (see DESIGN_ONLY_FIELDS_ENABLED). */}
                    {DESIGN_ONLY_FIELDS_ENABLED && (
                      <>
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
                              validatePhone(
                                fieldApi.form.getFieldValue("contact.phoneCountry"),
                                value
                              ),
                            onSubmit: ({ value, fieldApi }) =>
                              validatePhone(
                                fieldApi.form.getFieldValue("contact.phoneCountry"),
                                value
                              ),
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
                      </>
                    )}
                  </div>
                </CollapsibleEditorSection>
              </Accordion>
            )}
          </form>
        </div>

        {/* The checkout preview only reflects fields create does not send (see DESIGN_ONLY_FIELDS_ENABLED). */}
        {DESIGN_ONLY_FIELDS_ENABLED && (
          <>
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
                  {codeActions}
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
          </>
        )}
      </div>

      <GetCodeDialog open={getCodeOpen} onOpenChange={setGetCodeOpen} lines={embedLines} />
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
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>{children}</span>
      </TooltipTrigger>
      <TooltipContent>Available once the button is created</TooltipContent>
    </Tooltip>
  );
}

/**
 * Create a payment button, in a modal over the list. The list has already
 * applied the page's gates (product enabled, MID eligible) and resolved the
 * MID to create under, asking first when there are several, so the modal only
 * ever opens on a known MID. The editor's own header carries Close, so the
 * dialog's built-in close button is off.
 */
export function CreatePaymentButtonDialog({
  mid,
  open,
  onOpenChange,
}: {
  mid: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Once created, the editor's modal closes and the "button is live" dialog
  // takes its place at its own size, rather than stacking inside it.
  const [live, setLive] = useState<{ script: PaymentButtonScript; label: string } | null>(null);
  const finish = () => {
    setLive(null);
    onOpenChange(false);
  };

  return (
    <>
      <ButtonLiveDialog
        open={!!live}
        label={live?.label ?? ""}
        lines={live ? buildLiveEmbedLines(live.script) : []}
        onDone={finish}
      />
      <Dialog open={open && !live} onOpenChange={onOpenChange}>
        <DialogContent
          showClose={false}
          className="flex max-h-[min(88vh,820px)] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        >
          <DialogTitle asChild>
            <VisuallyHidden>Create a new payment button</VisuallyHidden>
          </DialogTitle>
          {/* Keyed by MID: switching accounts starts a fresh form, since
            currencies and the website are per MID. */}
          {mid && (
            <CreatePaymentButtonEditor
              key={mid}
              mid={mid}
              onClose={() => onOpenChange(false)}
              onCreated={(script, label) => setLive({ script, label })}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * A saved button's settings as form values: the currency and the two
 * required-field switches it has; everything else keeps the create defaults
 * (it is design-only, see DESIGN_ONLY_FIELDS_ENABLED).
 */
function formValuesFromConfig(config: PaymentButtonConfig): PaymentButtonFormValues {
  return {
    ...EMPTY_PAYMENT_BUTTON_FORM,
    currency: config.iso3CurrencyCode || EMPTY_PAYMENT_BUTTON_FORM.currency,
    collect: {
      ...EMPTY_PAYMENT_BUTTON_FORM.collect,
      email: !!config.pbRequiredFields?.customerEmailId,
      phone: !!config.pbRequiredFields?.customerPhoneNumber,
    },
  };
}

/**
 * Edit a payment button's settings, in the same modal as create. Loads the
 * saved settings first (fresh each time), then opens the editor on them.
 */
export function EditPaymentButtonDialog({
  target,
  onOpenChange,
}: {
  target: PaymentButtonEditTarget | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { config, isLoading, isError, refetch } = usePaymentButtonConfig(target);
  const close = () => onOpenChange(false);

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={false}
        className="flex max-h-[min(88vh,820px)] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
      >
        <DialogTitle asChild>
          <VisuallyHidden>Edit payment button</VisuallyHidden>
        </DialogTitle>
        {target && config ? (
          <CreatePaymentButtonEditor
            key={`${target.mid}:${target.buttonId}`}
            mid={target.mid}
            onClose={close}
            edit={{ buttonId: target.buttonId, config }}
          />
        ) : (
          <div className="flex flex-col gap-4 p-6">
            {isError ? (
              <PlaceholderState
                variant="error"
                title="Couldn't load this payment button"
                description="Something went wrong while fetching its settings."
                action={
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={close}>
                      Close
                    </Button>
                    <Button variant="outline" size="sm" onClick={refetch}>
                      Retry
                    </Button>
                  </div>
                }
                className="py-10"
              />
            ) : isLoading ? (
              <>
                <Shimmer className="h-7 w-56" />
                <Shimmer className="h-10 w-full" />
                <Shimmer className="h-10 w-full" />
                <Shimmer className="h-24 w-full" />
              </>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
