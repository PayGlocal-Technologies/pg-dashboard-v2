"use client";

import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Card,
  Field,
  FieldError,
  FieldLabel,
  Input,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Textarea,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { currencySymbol } from "@/lib/utils/format";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import { CURRENCY_FILTER_OPTIONS } from "@/features/dashboard/multi-currency/constants";
import { CustomerPreview } from "@/features/dashboard/mca-links/components/CustomerPreview";

// Same seven receiving currencies the MCA filter chips offer, so a merchant
// can never build a link in a currency there's no account to receive it in.
const CURRENCY_OPTIONS = CURRENCY_FILTER_OPTIONS;

const paymentDetailsSchema = z.object({
  currency: z.string().min(1, "Select a currency"),
  amount: z
    .string()
    .min(1, "Enter an amount")
    .refine((v) => Number.isFinite(parseFloat(v)) && parseFloat(v) > 0, "Enter an amount greater than 0"),
  invoiceNumber: z.string().trim().min(1, "Enter an invoice number"),
  description: z.string().trim().min(1, "Enter a product description"),
});

/**
 * Numbered step marker in an Accordion header. Shows the step number until
 * that section's fields are all valid, then a check — so the marker reports
 * progress rather than just restating the section's position.
 */
function StepIndicator({ step, complete }: { step: number; complete: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold",
        complete ? "bg-emerald-600 text-white" : "bg-primary text-primary-foreground"
      )}
    >
      {complete ? <Icon name="check" className="h-3.5 w-3.5" /> : step}
    </span>
  );
}

/** Red asterisk before a required field's label, matching the reference. */
function RequiredMark() {
  return (
    <span aria-hidden className="text-destructive">
      *
    </span>
  );
}

interface CreateMcaLinkPageProps {
  onBack: () => void;
}

/**
 * Create MCA Link — a full page that replaces the MCA Links table in place
 * (same pattern as TransactionDetailsPage replacing the Transactions table),
 * so returning leaves the list's filters, ordering, and page untouched.
 *
 * Two columns on desktop: the form on the left, a live customer preview on
 * the right, each scrolling independently. Below `lg` the preview stacks
 * beneath the form.
 */
export function CreateMcaLinkPage({ onBack }: CreateMcaLinkPageProps) {
  const form = useForm({
    defaultValues: {
      currency: CURRENCY_OPTIONS[0]?.value ?? "USD",
      amount: "",
      invoiceNumber: "",
      description: "",
    },
    onSubmit: ({ value }) => {
      // TODO: POST to the create-link endpoint once it exists. Per CLAUDE.md,
      // the URL, payload shape, and encryption boundary must be confirmed
      // against pg-dashboard rather than inferred — so nothing is sent yet.
      void value;
      toast.message("Create MCA Link", {
        description: "This flow isn't connected to the backend yet.",
      });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="max-w-[1400px] mx-auto page-enter"
      noValidate
    >
      <div className="-ml-2 mb-2 flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={<Icon name="chevron-left" className="h-4 w-4" />}
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground"
        >
          Back to MCA Links
        </Button>
      </div>

      <PageHeader
        title="Create MCA Link"
        actions={
          <Button type="submit" variant="primary" rightIcon={<Icon name="check" className="h-4 w-4" />}>
            Create MCA Link
          </Button>
        }
      />

      <Separator className="mb-6" />

      {/* Two columns on desktop, stacked below lg. Each column caps its own
          height against the viewport and scrolls inside that cap, so a long
          preview never drags the form off screen and vice versa; the cap is
          only applied from lg up, where the columns actually sit side by
          side. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="min-w-0 lg:max-h-[calc(100vh-16rem)] lg:overflow-y-auto lg:pr-1">
          <Card className="gap-0 px-5 py-1">
            <Accordion type="multiple" defaultValue={["payment-details"]}>
              <AccordionItem value="payment-details">
                <form.Subscribe
                  selector={(s) => ({
                    currency: s.values.currency,
                    amount: s.values.amount,
                    invoiceNumber: s.values.invoiceNumber,
                    description: s.values.description,
                  })}
                >
                  {(values) => (
                    <AccordionTrigger>
                      <span className="flex items-center gap-3">
                        <StepIndicator
                          step={1}
                          complete={paymentDetailsSchema.safeParse(values).success}
                        />
                        <span className="text-[15px] font-semibold text-foreground">
                          Payment Details
                        </span>
                      </span>
                    </AccordionTrigger>
                  )}
                </form.Subscribe>

                <AccordionContent className="pb-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Payment Amount: currency selector and amount input
                        share one row, as one control. */}
                    <Field>
                      <FieldLabel htmlFor="mca-link-amount">
                        <RequiredMark /> Payment Amount
                      </FieldLabel>
                      <div className="flex items-start gap-2">
                        <form.Field name="currency">
                          {(field) => (
                            <Select
                              value={field.state.value}
                              onValueChange={(v) => field.handleChange(v)}
                            >
                              <SelectTrigger className="w-[110px] shrink-0" aria-label="Currency">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CURRENCY_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    <span className="flex items-center gap-2">
                                      {/* The Rest of the World entry has no
                                          iso2 (it's a SWIFT-rail catch-all,
                                          not a country), so it shows a globe
                                          and its own label instead of a flag
                                          and a currency code. */}
                                      {option.iso2 ? (
                                        <CountryFlag iso2={option.iso2} />
                                      ) : (
                                        <Icon
                                          name="globe"
                                          className="h-3.5 w-5 shrink-0 text-muted-foreground"
                                        />
                                      )}
                                      {option.iso2
                                        ? `${option.value} ${currencySymbol(option.value)}`
                                        : option.label}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </form.Field>

                        <form.Field
                          name="amount"
                          validators={{
                            onBlur: ({ value }) => {
                              const r = paymentDetailsSchema.shape.amount.safeParse(value);
                              return r.success ? undefined : r.error.issues[0]?.message;
                            },
                          }}
                        >
                          {(field) => (
                            <div className="min-w-0 flex-1">
                              <Input
                                id="mca-link-amount"
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={field.state.value}
                                onChange={(e) => field.handleChange(e.target.value)}
                                onBlur={field.handleBlur}
                              />
                              <FieldError>{field.state.meta.errors[0]}</FieldError>
                            </div>
                          )}
                        </form.Field>
                      </div>
                    </Field>

                    <form.Field
                      name="invoiceNumber"
                      validators={{
                        onBlur: ({ value }) => {
                          const r = paymentDetailsSchema.shape.invoiceNumber.safeParse(value);
                          return r.success ? undefined : r.error.issues[0]?.message;
                        },
                      }}
                    >
                      {(field) => (
                        <Field>
                          <FieldLabel htmlFor="mca-link-invoice">
                            <RequiredMark /> Invoice No.
                          </FieldLabel>
                          <Input
                            id="mca-link-invoice"
                            placeholder="INV-123"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                          />
                          <FieldError>{field.state.meta.errors[0]}</FieldError>
                        </Field>
                      )}
                    </form.Field>
                  </div>

                  <Separator className="my-5" />

                  <form.Field
                    name="description"
                    validators={{
                      onBlur: ({ value }) => {
                        const r = paymentDetailsSchema.shape.description.safeParse(value);
                        return r.success ? undefined : r.error.issues[0]?.message;
                      },
                    }}
                  >
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor="mca-link-description">
                          <RequiredMark /> Product Description
                        </FieldLabel>
                        <Textarea
                          id="mca-link-description"
                          rows={3}
                          placeholder="What is this payment for?"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                        />
                        <FieldError>{field.state.meta.errors[0]}</FieldError>
                      </Field>
                    )}
                  </form.Field>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="customer-details">
                <AccordionTrigger>
                  <span className="flex items-center gap-3">
                    {/* No fields to complete yet, so this step can't report
                        progress — it stays on its number until the section
                        actually has inputs to validate. */}
                    <StepIndicator step={2} complete={false} />
                    <span className="text-[15px] font-semibold text-foreground">
                      Customer Details
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-5">
                  <p className="text-[13px] text-muted-foreground">
                    Customer information fields are not available yet. The link can be created
                    without them for now.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </div>

        {/* Live customer preview — re-renders on every keystroke via
            form.Subscribe, so the right column always shows what the
            customer would see for the values currently on the left. */}
        <div className="min-w-0 lg:max-h-[calc(100vh-16rem)] lg:overflow-y-auto lg:pr-1">
          <h2 className="mb-3 text-[15px] font-semibold text-foreground">Customer Preview</h2>
          <div className="rounded-xl border border-border bg-muted/40 p-4 sm:p-6">
            {/* Scaled device frame: the payment page renders at a fixed
                phone-ish width and shrinks with the column below that. */}
            <div className="mx-auto w-full max-w-[420px]">
              <form.Subscribe
                selector={(s) => ({
                  amount: s.values.amount,
                  currency: s.values.currency,
                  invoiceNumber: s.values.invoiceNumber,
                  description: s.values.description,
                })}
              >
                {(values) => (
                  <CustomerPreview
                    amount={values.amount}
                    currency={values.currency}
                    invoiceNumber={values.invoiceNumber}
                    description={values.description}
                  />
                )}
              </form.Subscribe>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
