"use client";

import { useState, type ReactNode } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { toast } from "sonner";
import {
  Alert,
  AlertDescription,
  Button,
  DataTable,
  DatePicker,
  Dialog,
  DialogContent,
  DialogTitle,
  Field,
  FieldError,
  FieldLabel,
  Input,
  SingleSelect,
  Switch,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn, formatCurrency } from "@/lib/utils";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import {
  DEFAULT_CALLING_CODE,
  DEFAULT_CALLING_CODE_ISO2,
  DEFAULT_VALUES,
  FIRST_INSTALMENT_TYPE_OPTIONS,
  FREQUENCY_OPTIONS,
} from "@/features/dashboard/payment-links/create/constants";
import {
  buildCreatePaymentLinkRequest,
  calculateInstalmentPlan,
  defaultExpiryHours,
  expiryOptionsFor,
  validatePaymentLink,
  type FieldErrors,
} from "@/features/dashboard/payment-links/create/helpers";
import {
  useCreatePaymentLink,
  usePaymentLinkCallingCodes,
  usePaymentLinkConfig,
  usePaymentLinkCountries,
  usePaymentLinkCurrencies,
  usePaymentLinkMid,
  usePaymentLinkStates,
} from "@/features/dashboard/payment-links/create/hooks";
import type {
  AddressDetails,
  FirstInstalmentType,
} from "@/features/dashboard/payment-links/create/types";
import type { PaymentLinkRow } from "@/features/dashboard/payment-links/types";

/** A section's heading, e.g. "Customer details". */
function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-sm font-semibold text-foreground">{children}</h3>;
}

/**
 * A text input with its error. `label` shows above the field; without one,
 * the placeholder is the visible prompt and `name` the accessible label (the
 * customer and address fields, as designed).
 */
function TextField({
  id,
  label,
  name,
  required,
  value,
  onChange,
  error,
  placeholder,
  inputMode,
  className,
}: {
  id: string;
  label?: string;
  name?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  inputMode?: "decimal" | "numeric" | "email" | "tel";
  className?: string;
}) {
  return (
    <Field className={cn("gap-1.5", className)}>
      <FieldLabel htmlFor={id} className={label ? undefined : "sr-only"}>
        {label ?? name}
        {required && <span className="text-destructive"> *</span>}
      </FieldLabel>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        aria-invalid={Boolean(error)}
      />
      <FieldError>{error}</FieldError>
    </Field>
  );
}

/** A searchable select with its error, labelled the same way as TextField. */
function SelectField({
  id,
  label,
  name,
  value,
  options,
  onChange,
  error,
  placeholder,
  disabled,
  className,
}: {
  id: string;
  label?: string;
  name?: string;
  value: string;
  options: { value: string; label: string; icon?: ReactNode }[];
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Field className={cn("gap-1.5", className)}>
      <FieldLabel htmlFor={id} className={label ? undefined : "sr-only"}>
        {label ?? name}
      </FieldLabel>
      <SingleSelect
        id={id}
        value={value}
        options={options}
        onChange={onChange}
        placeholder={placeholder}
        showSearch
        disabled={disabled}
        invalid={Boolean(error)}
      />
      <FieldError>{error}</FieldError>
    </Field>
  );
}

interface CreatePaymentLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (row: PaymentLinkRow) => void;
}

/**
 * Create payment link: one column, Amount and Purpose up top, the restricted
 * items warning, then Customer, Billing and Shipping details, then the link's
 * settings (expiry, and recurring where the merchant has SI).
 *
 * Fields, rules and the request are pg-dashboard's create-link screen (the
 * PAYMENT page of src/features/create-mca-payment-invoice); the merchant's
 * payment link config decides which customer fields are required, the
 * longest expiry, and the default currency. Creates with
 * POST /customer-data/payment-link/{mid}; on success the link is handed to
 * the list (`onCreated`), which opens it with its link, QR and Copy.
 */
/**
 * The link's ID from the URL the create returns. The hosted link carries it
 * as the `x-gl-link-id` query parameter (".../payments/pl?x-gl-link-id=…");
 * a path-style link falls back to its last segment.
 */
function paymentLinkIdFrom(link: string): string {
  try {
    const url = new URL(link);
    return url.searchParams.get("x-gl-link-id") || url.pathname.split("/").pop() || "";
  } catch {
    return link.split("/").pop() ?? "";
  }
}

export function CreatePaymentLinkModal({
  open,
  onOpenChange,
  onCreated,
}: CreatePaymentLinkModalProps) {
  const mid = usePaymentLinkMid();
  const { config } = usePaymentLinkConfig(mid);
  const currencyOptions = usePaymentLinkCurrencies(mid);
  const countryOptions = usePaymentLinkCountries();
  const callingCodes = usePaymentLinkCallingCodes();
  const { mutate: createLink, isPending } = useCreatePaymentLink(mid);

  // Errors show once a create has been tried, then follow the fields live.
  const [attempted, setAttempted] = useState(false);
  // Upstream disables today and earlier for the first instalment; captured
  // once (see CLAUDE.md's no-Date-during-render rule).
  const [tomorrowKey] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  });

  const form = useForm({ defaultValues: DEFAULT_VALUES });
  const formValues = useStore(form.store, (s) => s.values);
  // The merchant's default expiry stands in until another is picked (the
  // field starts unset, at 0), so validation and the request both see it.
  const defaultExpiry = defaultExpiryHours(config.defaultPlExpiryHours);
  const values = {
    ...formValues,
    paymentDetails: {
      ...formValues.paymentDetails,
      expiry: formValues.paymentDetails.expiry || defaultExpiry,
    },
  };

  // The merchant's preferred currency and India's dial code stand in until
  // the merchant picks another, as upstream's initial values do.
  const currency = values.paymentDetails.txnCurrency || config.merchantPlPreferredCurrency || "";
  const callingCodeIso2 = values.customerDetails.callingCodeIso2 || DEFAULT_CALLING_CODE_ISO2;
  const callingCode =
    values.customerDetails.callingCode ||
    callingCodes.find((c) => c.value === callingCodeIso2)?.callingCode ||
    DEFAULT_CALLING_CODE;

  const enableNonPercentageSi = !!config.enableNonPercentageSi;
  const plan = calculateInstalmentPlan(values, enableNonPercentageSi);
  const errors: FieldErrors = attempted ? validatePaymentLink(values, config, currency) : {};

  const billingStates = usePaymentLinkStates(values.billingDetails.country);
  const shippingStates = usePaymentLinkStates(values.shippingDetails.country);

  const expiryOptions = expiryOptionsFor(defaultExpiry);
  const isRecurring = !!config.merchantSIEnabled && values.paymentDetails.isRecurringPayment;

  // Changing the amount (or the first instalment's terms) invalidates the
  // instalments worked out from it, so upstream clears them and says so.
  const clearRecurringFor = (what: "amount" | "type" | "first") => {
    const r = form.getFieldValue("recurringPaymentDetails");
    const hadPlan = Boolean(r.firstInstalment || r.numberOfPayments);
    if (what !== "first") form.setFieldValue("recurringPaymentDetails.firstInstalment", "");
    form.setFieldValue("recurringPaymentDetails.numberOfPayments", "");
    if (!hadPlan) return;
    if (what === "amount") {
      toast.info("Recurring Payment details updated", {
        description:
          "First instalment and number of payments have been removed due to change in payment amount",
      });
    } else if (what === "first" && r.numberOfPayments) {
      toast.info("Number of payments have been removed due to change in first instalment");
    }
  };

  const submit = () => {
    setAttempted(true);
    if (Object.keys(validatePaymentLink(values, config, currency)).length > 0) return;
    if (!mid) {
      toast.error("Select a merchant account to create a payment link");
      return;
    }

    const body = buildCreatePaymentLinkRequest(values, mid, currency, callingCode, plan);
    createLink(body, {
      onSuccess: (response) => {
        const link = response?.data?.paymentLink ?? "";
        const amount = isRecurring
          ? (plan.firstInstalmentAmount ?? 0)
          : Number(values.paymentDetails.totalAmount) || 0;
        const now = Date.now();
        const billing = values.billingDetails;
        // The create invalidates every query, so the list refetches the new
        // link from the server on its own. This row only opens its details
        // straight away (link, QR, Copy), before that refetch lands.
        onCreated({
          id: paymentLinkIdFrom(link) || `pl_${now}`,
          mid,
          amount,
          currency,
          status: "ACTIVE",
          customerName: values.customerDetails.fullName,
          customerDetails: values.customerDetails.emailId,
          customerPhone: values.customerDetails.phoneNumber
            ? `${callingCode} ${values.customerDetails.phoneNumber}`
            : "",
          billingAddress: [
            billing.streetAddress,
            billing.landmark,
            billing.city,
            billing.state,
            billing.zipcode,
          ]
            .filter(Boolean)
            .join(", "),
          paymentLinkUrl: link.replace(/^https?:\/\//i, ""),
          paymentFor: values.paymentDetails.productDescription,
          createdAt: new Date(now).toISOString(),
          expiresAt: new Date(now + values.paymentDetails.expiry * 3_600_000).toISOString(),
          notifyVia: callingCode === "+91" ? ["SMS", "Email"] : ["Email"],
        });
        onOpenChange(false);
        form.reset();
        setAttempted(false);
      },
      onError: (error) => toast.error(error?.message || "Failed to create link"),
    });
  };

  const addressFields = (section: "billingDetails" | "shippingDetails") => {
    const address: AddressDetails = values[section];
    const states = section === "billingDetails" ? billingStates : shippingStates;
    const set = (field: keyof AddressDetails, value: string) =>
      form.setFieldValue(`${section}.${field}`, value);
    const err = (field: keyof AddressDetails) => errors[`${section}.${field}`];
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField
          id={`${section}-street`}
          name="Address line 1"
          value={address.streetAddress}
          onChange={(v) => set("streetAddress", v)}
          error={err("streetAddress")}
          placeholder="Address line 1"
          className="sm:col-span-2"
        />
        <TextField
          id={`${section}-landmark`}
          name="Address line 2"
          value={address.landmark}
          onChange={(v) => set("landmark", v)}
          error={err("landmark")}
          placeholder="Address line 2"
          className="sm:col-span-2"
        />
        <SelectField
          id={`${section}-country`}
          name="Country"
          value={address.country}
          options={countryOptions.map((c) => ({
            ...c,
            icon: <CountryFlag iso2={c.value} alt="" />,
          }))}
          onChange={(v) => {
            set("country", v);
            // A state belongs to its country, so a new country clears it.
            set("state", "");
          }}
          placeholder="Country"
        />
        <SelectField
          id={`${section}-state`}
          name="State"
          value={address.state}
          options={states}
          onChange={(v) => set("state", v)}
          placeholder="State"
          disabled={!address.country}
        />
        <TextField
          id={`${section}-city`}
          name="City"
          value={address.city}
          onChange={(v) => set("city", v)}
          error={err("city")}
          placeholder="City"
        />
        <TextField
          id={`${section}-zipcode`}
          name="Zipcode"
          value={address.zipcode}
          onChange={(v) => set("zipcode", v)}
          error={err("zipcode")}
          placeholder="Zipcode"
        />
      </div>
    );
  };

  const r = values.recurringPaymentDetails;
  const isPercentage = r.firstInstalmentDetails === "percentage";
  const firstAmount = isPercentage
    ? (Number(values.paymentDetails.totalAmount) * Number(r.firstInstalment)) / 100
    : Number(r.firstInstalment);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-[40rem] flex-col gap-0 overflow-hidden p-0">
        <div className="shrink-0 border-b border-border px-6 py-4 pr-14">
          <DialogTitle>Create payment link</DialogTitle>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex min-h-0 flex-1 flex-col"
          noValidate
        >
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
            {/* ── Amount and purpose ─────────────────────────────────── */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="pl-amount">
                    Amount<span className="text-destructive"> *</span>
                  </FieldLabel>
                  <div className="flex">
                    <div className="w-28 shrink-0 [&_button]:rounded-r-none">
                      <SingleSelect
                        id="pl-currency"
                        value={currency}
                        options={currencyOptions}
                        onChange={(v) => form.setFieldValue("paymentDetails.txnCurrency", v)}
                        placeholder="Currency"
                        showSearch
                        invalid={Boolean(errors["paymentDetails.txnCurrency"])}
                      />
                    </div>
                    <Input
                      id="pl-amount"
                      value={values.paymentDetails.totalAmount}
                      onChange={(e) => {
                        form.setFieldValue("paymentDetails.totalAmount", e.target.value);
                        clearRecurringFor("amount");
                      }}
                      placeholder="Enter amount"
                      inputMode="decimal"
                      aria-invalid={Boolean(errors["paymentDetails.totalAmount"])}
                      className="-ml-px rounded-l-none"
                    />
                  </div>
                  <FieldError>
                    {errors["paymentDetails.totalAmount"] ?? errors["paymentDetails.txnCurrency"]}
                  </FieldError>
                </Field>
                <TextField
                  id="pl-purpose"
                  label="Purpose"
                  required
                  value={values.paymentDetails.productDescription}
                  onChange={(v) => form.setFieldValue("paymentDetails.productDescription", v)}
                  error={errors["paymentDetails.productDescription"]}
                  placeholder="Eg. Payment for freelancer services"
                />
              </div>

              <Alert variant="warning">
                <AlertDescription>
                  This payment link cannot be used for prohibited or restricted items, such as{" "}
                  <strong>medicines, tobacco, drugs, narcotics or weapons</strong>. Violations may
                  result in your account being suspended or blocked.
                </AlertDescription>
              </Alert>
            </div>

            {/* ── Customer details ───────────────────────────────────── */}
            <section className="space-y-3">
              <SectionTitle>Customer details</SectionTitle>
              <TextField
                id="pl-name"
                name="Full name"
                value={values.customerDetails.fullName}
                onChange={(v) => form.setFieldValue("customerDetails.fullName", v)}
                error={errors["customerDetails.fullName"]}
                placeholder="Full name"
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="pl-phone" className="sr-only">
                    Phone number
                  </FieldLabel>
                  <div className="flex">
                    {/* Wide enough for the longest code with its flag
                        ("+1-684"), with the trigger's padding trimmed so the
                        code itself gets the room. */}
                    <div className="w-[8.5rem] shrink-0 [&_button]:rounded-r-none">
                      <SingleSelect
                        id="pl-calling-code"
                        className="gap-1.5 px-3"
                        value={callingCodeIso2}
                        options={callingCodes.map((c) => ({
                          value: c.value,
                          label: c.label,
                          icon: <CountryFlag iso2={c.value} alt="" />,
                        }))}
                        onChange={(iso2) => {
                          form.setFieldValue("customerDetails.callingCodeIso2", iso2);
                          form.setFieldValue(
                            "customerDetails.callingCode",
                            callingCodes.find((c) => c.value === iso2)?.callingCode ?? ""
                          );
                        }}
                        placeholder="Code"
                        showSearch
                        filterOption={(option, query) => {
                          const q = query.toLowerCase();
                          const name = callingCodes.find(
                            (c) => c.value === option.value
                          )?.countryName;
                          return (
                            option.label.toLowerCase().includes(q) ||
                            option.value.toLowerCase().includes(q) ||
                            (name?.toLowerCase().includes(q) ?? false)
                          );
                        }}
                      />
                    </div>
                    <Input
                      id="pl-phone"
                      value={values.customerDetails.phoneNumber}
                      onChange={(e) =>
                        form.setFieldValue("customerDetails.phoneNumber", e.target.value)
                      }
                      placeholder="9876543210"
                      inputMode="tel"
                      aria-invalid={Boolean(errors["customerDetails.phoneNumber"])}
                      className="-ml-px rounded-l-none"
                    />
                  </div>
                  <FieldError>{errors["customerDetails.phoneNumber"]}</FieldError>
                </Field>
                <TextField
                  id="pl-email"
                  name="Email"
                  value={values.customerDetails.emailId}
                  onChange={(v) => form.setFieldValue("customerDetails.emailId", v)}
                  error={errors["customerDetails.emailId"]}
                  placeholder="Eg. john.doe@example.com"
                  inputMode="email"
                />
              </div>
            </section>

            {/* ── Billing details ────────────────────────────────────── */}
            <section className="space-y-3">
              <SectionTitle>Billing details</SectionTitle>
              {addressFields("billingDetails")}
            </section>

            {/* ── Shipping details ───────────────────────────────────── */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <SectionTitle>Shipping Details</SectionTitle>
                <Field orientation="horizontal" className="w-auto items-center gap-2">
                  <FieldLabel htmlFor="pl-same-shipping" className="text-xs font-normal">
                    Same as billing
                  </FieldLabel>
                  <Switch
                    id="pl-same-shipping"
                    checked={values.billingDetails.shippingSameAsBilling}
                    onCheckedChange={(next) =>
                      form.setFieldValue("billingDetails.shippingSameAsBilling", next)
                    }
                  />
                </Field>
              </div>
              {!values.billingDetails.shippingSameAsBilling && addressFields("shippingDetails")}
            </section>

            {/* ── Link settings: expiry, and recurring where SI is on ──── */}
            <section className="space-y-3">
              <SectionTitle>Link settings</SectionTitle>
              <SelectField
                id="pl-expiry"
                label="Payment link will expire in"
                value={String(values.paymentDetails.expiry)}
                options={expiryOptions}
                onChange={(v) => form.setFieldValue("paymentDetails.expiry", Number(v))}
                error={errors["paymentDetails.expiry"]}
              />
              {config.merchantSIEnabled && (
                <Field orientation="horizontal" className="items-center gap-3">
                  <Switch
                    id="pl-recurring"
                    checked={values.paymentDetails.isRecurringPayment}
                    onCheckedChange={(next) =>
                      form.setFieldValue("paymentDetails.isRecurringPayment", next)
                    }
                  />
                  <FieldLabel htmlFor="pl-recurring">Recurring payment</FieldLabel>
                </Field>
              )}
              {isRecurring && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {!enableNonPercentageSi && (
                    <>
                      <SelectField
                        id="pl-first-type"
                        label="First instalment details"
                        value={r.firstInstalmentDetails}
                        options={FIRST_INSTALMENT_TYPE_OPTIONS}
                        onChange={(v) => {
                          form.setFieldValue(
                            "recurringPaymentDetails.firstInstalmentDetails",
                            v as FirstInstalmentType
                          );
                          clearRecurringFor("type");
                        }}
                      />
                      <TextField
                        id="pl-first"
                        label={
                          isPercentage && firstAmount
                            ? `First instalment: ${currency} ${firstAmount.toFixed(2)}`
                            : "First instalment"
                        }
                        value={r.firstInstalment}
                        onChange={(v) => {
                          form.setFieldValue("recurringPaymentDetails.firstInstalment", v);
                          clearRecurringFor("first");
                        }}
                        error={errors["recurringPaymentDetails.firstInstalment"]}
                        inputMode="decimal"
                      />
                    </>
                  )}
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="pl-start">Start date</FieldLabel>
                    <DatePicker
                      value={r.startDate}
                      onChange={(v) => form.setFieldValue("recurringPaymentDetails.startDate", v)}
                      min={tomorrowKey}
                      placeholder="Select date"
                    />
                    <FieldError>{errors["recurringPaymentDetails.startDate"]}</FieldError>
                  </Field>
                  <TextField
                    id="pl-payments"
                    label="Number of payments"
                    value={r.numberOfPayments}
                    onChange={(v) =>
                      form.setFieldValue("recurringPaymentDetails.numberOfPayments", v)
                    }
                    error={errors["recurringPaymentDetails.numberOfPayments"]}
                    inputMode="numeric"
                  />
                  <SelectField
                    id="pl-frequency"
                    label="Frequency"
                    value={r.frequency}
                    options={FREQUENCY_OPTIONS}
                    onChange={(v) => form.setFieldValue("recurringPaymentDetails.frequency", v)}
                  />
                  {enableNonPercentageSi && (
                    <TextField
                      id="pl-subsequent"
                      label="SI subsequent amount"
                      value={r.siSubsequentAmount}
                      onChange={(v) =>
                        form.setFieldValue("recurringPaymentDetails.siSubsequentAmount", v)
                      }
                      error={errors["recurringPaymentDetails.siSubsequentAmount"]}
                      placeholder="Enter amount"
                      inputMode="decimal"
                    />
                  )}
                  {plan.adjustment && (
                    <p className="flex items-start gap-1.5 text-xs text-muted-foreground sm:col-span-2">
                      <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      {plan.adjustment}
                    </p>
                  )}
                  {plan.rows.length > 0 && (
                    <div className="sm:col-span-2">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Instalment summary
                      </p>
                      <DataTable
                        columns={[
                          { key: "sNo", header: "S.No", render: (row) => row.sNo },
                          {
                            key: "amount",
                            header: "Amount",
                            render: (row) => formatCurrency(row.amount, currency || "INR"),
                          },
                          { key: "date", header: "Date", render: (row) => row.date },
                        ]}
                        data={plan.rows}
                        rowKey={(row) => String(row.sNo)}
                        density="compact"
                        pagination={{ mode: "none" }}
                      />
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-border px-6 py-4">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => onOpenChange(false)}
              className="w-full text-primary"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isPending}
              disabled={isPending}
              className="w-full"
            >
              Create payment link
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
