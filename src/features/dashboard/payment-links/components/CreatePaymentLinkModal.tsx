"use client";

import { useState } from "react";
import { useStore, type AnyFieldApi } from "@tanstack/react-form";
import {
  Button,
  Card,
  Checkbox,
  CountrySelect,
  DatePicker,
  Dialog,
  DialogContent,
  DialogTitle,
  Field,
  FieldError,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  TimePicker,
} from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { RequiredMark } from "@/components/common/RequiredMark";
import { useAppForm } from "@/components/form/AppForm";
import { cn, formatCurrency } from "@/lib/utils";
import type { PaymentLinkRow } from "@/features/dashboard/payment-links/types";

const SUPPORTED_CURRENCIES = ["USD", "INR", "EUR", "GBP", "AED", "SGD"];

type ExpiryOption = "24h" | "7d" | "30d" | "90d" | "custom";
const EXPIRY_OPTIONS: { value: ExpiryOption; label: string }[] = [
  { value: "24h", label: "24 Hours" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "custom", label: "Custom" },
];

type RecurringFrequency = "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
const FREQUENCY_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom" },
];

type NotifyChannel = "SMS" | "Email" | "WhatsApp";
const NOTIFY_CHANNELS: NotifyChannel[] = ["SMS", "Email", "WhatsApp"];

type SectionKey = "customer" | "billing" | "reminders" | "expiry" | "recurring";

const SECTIONS: { key: SectionKey; label: string; icon: IconName }[] = [
  { key: "customer", label: "Customer details", icon: "users" },
  { key: "billing", label: "Billing details", icon: "map-pin" },
  { key: "reminders", label: "Add reminders", icon: "bell" },
  { key: "expiry", label: "Expiry date", icon: "calendar-days" },
  { key: "recurring", label: "Recurring payment", icon: "repeat" },
];

interface AddressValues {
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

const EMPTY_ADDRESS: AddressValues = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  country: "",
  pincode: "",
};

interface CreatePaymentLinkFormValues {
  currency: string;
  amount: string;
  paymentDescription: string;
  referenceId: string;
  expiryOption: ExpiryOption;
  customExpiryDate: string;
  customExpiryTime: string;

  customerName: string;
  customerEmail: string;
  customerPhoneCountry: string;
  customerPhone: string;
  notifyVia: NotifyChannel[];

  billing: AddressValues;
  shippingSameAsBilling: boolean;
  shipping: AddressValues;

  recurringEnabled: boolean;
  recurringFrequency: RecurringFrequency;
  recurringStartDate: string;
  recurringStartTime: string;
  recurringEndDate: string;
  recurringMaxPayments: string;

  notes: string;
}

const DEFAULT_VALUES: CreatePaymentLinkFormValues = {
  currency: "USD",
  amount: "",
  paymentDescription: "",
  referenceId: "",
  expiryOption: "7d",
  customExpiryDate: "",
  customExpiryTime: "",

  customerName: "",
  customerEmail: "",
  customerPhoneCountry: "US",
  customerPhone: "",
  notifyVia: [],

  billing: { ...EMPTY_ADDRESS },
  shippingSameAsBilling: true,
  shipping: { ...EMPTY_ADDRESS },

  recurringEnabled: false,
  recurringFrequency: "monthly",
  recurringStartDate: "",
  recurringStartTime: "",
  recurringEndDate: "",
  recurringMaxPayments: "",

  notes: "",
};

function isAddressComplete(a: AddressValues): boolean {
  return !!(
    a.line1.trim() &&
    a.city.trim() &&
    a.state.trim() &&
    a.country.trim() &&
    a.pincode.trim()
  );
}

function hasValidPhone(phone: string): boolean {
  return phone.replace(/\D/g, "").length >= 7;
}

function isAddressEmpty(a: AddressValues): boolean {
  return (
    !a.line1.trim() && !a.city.trim() && !a.state.trim() && !a.country.trim() && !a.pincode.trim()
  );
}

type AddressKey = "line1" | "city" | "state" | "country" | "pincode";
const ADDRESS_REQUIRED: AddressKey[] = ["line1", "city", "state", "country", "pincode"];

/** One message per field that blocks submit, keyed by form field name
 *  (`billing.line1` for an address part). */
type FormErrors = Partial<Record<string, string>>;

/**
 * What stops the link being created, per field.
 *
 * Same rules the Create button used to be silently disabled on: amount is the
 * only always-required field; every section below only becomes required once
 * the merchant starts filling it (a half-finished address blocks, an untouched
 * one does not). The button stays live and a press names each gap, and the
 * conditional fields carry a * exactly while they are required.
 *
 * One function feeds both checks: the form-level submit validator runs it
 * whole, so a gap inside a collapsed (unmounted) section still blocks, and
 * each mounted field's onChange runs its own entry (the app-wide rule).
 */
function computeErrors(v: CreatePaymentLinkFormValues): FormErrors {
  const errors: FormErrors = {};
  // Named per field ("City is required"), matching Add bank details.
  const ADDRESS_LABELS: Record<AddressKey, string> = {
    line1: "Address line 1",
    city: "City",
    state: "State",
    country: "Country",
    pincode: "Pincode",
  };
  if (!v.amount.trim()) errors.amount = "Amount is required";
  else if (!(Number(v.amount) > 0)) errors.amount = "Enter an amount greater than 0";
  if (v.customerName.trim() && !v.customerEmail.trim() && !hasValidPhone(v.customerPhone))
    errors.customerEmail = "Add an email or phone number for this customer";
  const address = (a: AddressValues, prefix: string) => {
    if (isAddressEmpty(a)) return;
    for (const key of ADDRESS_REQUIRED)
      if (!a[key].trim()) errors[`${prefix}.${key}`] = `${ADDRESS_LABELS[key]} is required`;
  };
  address(v.billing, "billing");
  if (!v.shippingSameAsBilling) address(v.shipping, "shipping");
  if (v.expiryOption === "custom") {
    if (!v.customExpiryDate) errors.customExpiryDate = "Expiry date is required";
    if (!v.customExpiryTime) errors.customExpiryTime = "Expiry time is required";
  }
  if (v.recurringEnabled) {
    if (!v.recurringStartDate) errors.recurringStartDate = "Start date is required";
    if (!v.recurringStartTime) errors.recurringStartTime = "Start time is required";
  }
  return errors;
}

/** A field's own entry from computeErrors, as its onChange validator. It
 *  reads the whole form at check time, since most rules are conditional. */
function liveRule(name: string) {
  return ({ fieldApi }: { fieldApi: AnyFieldApi }) =>
    computeErrors(fieldApi.form.state.values as CreatePaymentLinkFormValues)[name];
}

/** Which collapsible section holds a field, so a failed press can open it. */
function sectionOf(errorKey: string): SectionKey | null {
  if (errorKey.startsWith("customer")) return "customer";
  if (errorKey.startsWith("billing") || errorKey.startsWith("shipping")) return "billing";
  if (errorKey.startsWith("customExpiry")) return "expiry";
  if (errorKey.startsWith("recurring")) return "recurring";
  return null;
}

function expiryLabel(v: CreatePaymentLinkFormValues): string {
  const preset = EXPIRY_OPTIONS.find((o) => o.value === v.expiryOption);
  if (v.expiryOption !== "custom") return preset?.label ?? "7 Days";
  return v.customExpiryDate
    ? `${v.customExpiryDate} ${v.customExpiryTime || ""}`.trim()
    : "Custom date";
}

/** Only called from the submit handler (an event handler, not render), safe
 * per this project's hooks-purity rule against Math.random/Date math during
 * render. Kept as a plain top-level function (not inline in the component)
 * so the purity lint can see it never runs during render. */
function generateShortId(): string {
  return Math.random().toString(36).slice(2, 8);
}

function nowIso(): string {
  return new Date().toISOString();
}

function expiresAtFromValues(v: CreatePaymentLinkFormValues): string {
  if (v.expiryOption === "custom" && v.customExpiryDate) {
    const time = v.customExpiryTime || "23:59";
    return new Date(`${v.customExpiryDate}T${time}:00`).toISOString();
  }
  const hoursByOption: Record<Exclude<ExpiryOption, "custom">, number> = {
    "24h": 24,
    "7d": 24 * 7,
    "30d": 24 * 30,
    "90d": 24 * 90,
  };
  const hours = hoursByOption[v.expiryOption as Exclude<ExpiryOption, "custom">] ?? 24 * 7;
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function addressLine(a: AddressValues): string {
  return [a.line1, a.line2, a.city, a.state, a.country, a.pincode].filter(Boolean).join(", ");
}

interface ChipGroupOption<T extends string> {
  value: T;
  label: string;
}

function SingleSelectChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ChipGroupOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-border bg-muted/50 p-1">
      {options.map((opt) => (
        <Button
          key={opt.value}
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(opt.value)}
          className={cn(
            "h-auto min-h-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium",
            value === opt.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}

interface SectionChipProps {
  icon: IconName;
  label: string;
  active: boolean;
  onClick: () => void;
}

/** Compact toggle, not a full-width expandable bar, each optional section
 * below (customer/billing/reminders/expiry/recurring) is opened/closed by
 * one of these instead of an accordion row. */
function SectionChip({ icon, label, active, onClick }: SectionChipProps) {
  return (
    <Button
      type="button"
      variant={active ? "primary" : "outline"}
      size="sm"
      onClick={onClick}
      leftIcon={<Icon name={icon} className="h-3.5 w-3.5" />}
      className="rounded-full"
    >
      {label}
    </Button>
  );
}

interface CreatePaymentLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (row: PaymentLinkRow) => void;
}

export function CreatePaymentLinkModal({
  open,
  onOpenChange,
  onCreated,
}: CreatePaymentLinkModalProps) {
  const [notifyViaTouched, setNotifyViaTouched] = useState(false);
  // Lazy initializer runs once on mount, not on every render, see CLAUDE.md.
  const [todayDateKey] = useState(() => new Date().toISOString().slice(0, 10));
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(new Set());

  function toggleSection(key: SectionKey) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const form = useAppForm({
    defaultValues: DEFAULT_VALUES,
    validators: {
      onSubmit: ({ value }) => {
        const errors = computeErrors(value);
        return Object.keys(errors).length ? { fields: errors } : undefined;
      },
    },
    // A gap inside a collapsed section would otherwise be invisible: open
    // every section holding one (form.Form then focuses the first).
    onSubmitInvalid: ({ value }) => {
      const keys = Object.keys(computeErrors(value));
      setOpenSections((prev) => {
        const next = new Set(prev);
        for (const key of keys) {
          const section = sectionOf(key);
          if (section) next.add(section);
        }
        return next;
      });
    },
    onSubmit: async ({ value }) => {
      const shortId = generateShortId();
      const row: PaymentLinkRow = {
        id: `pl_${shortId}`,
        amount: Number(value.amount) || 0,
        currency: value.currency,
        status: "ACTIVE",
        customerName: value.customerName,
        customerDetails: value.customerEmail,
        customerPhone: value.customerPhone
          ? `+${value.customerPhoneCountry === "IN" ? "91" : "1"} ${value.customerPhone}`
          : "",
        billingAddress: addressLine(value.billing),
        paymentLinkUrl: `pay.pgcl.com/${shortId}`,
        paymentFor: value.paymentDescription,
        createdAt: nowIso(),
        expiresAt: expiresAtFromValues(value),
        notifyVia: value.notifyVia,
      };
      onOpenChange(false);
      form.reset();
      setNotifyViaTouched(false);
      onCreated(row);
    },
  });

  function handleClose() {
    onOpenChange(false);
  }

  function applyNotifyDefaults(next: { customerEmail?: string; customerPhone?: string }) {
    if (notifyViaTouched) return;
    const email = next.customerEmail ?? form.getFieldValue("customerEmail");
    const phone = next.customerPhone ?? form.getFieldValue("customerPhone");
    form.setFieldValue("notifyVia", () => {
      const set = new Set<NotifyChannel>();
      if (email.trim()) set.add("Email");
      if (hasValidPhone(phone)) set.add("SMS");
      return Array.from(set);
    });
  }

  function toggleNotify(channel: NotifyChannel) {
    setNotifyViaTouched(true);
    form.setFieldValue("notifyVia", (prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  }

  const values = useStore(form.store, (state) => state.values);
  const hasContactStarted = !!values.customerName.trim();
  const errorOf = (field: AnyFieldApi) => field.state.meta.errors[0] as string | undefined;

  /** One address block (billing or shipping). Optional as a whole,
   *  all-or-nothing once started: the * appears on the required parts as soon
   *  as any part is filled. */
  const addressFields = (prefix: "billing" | "shipping") => {
    const started = !isAddressEmpty(values[prefix]);
    const mark = (key: AddressKey) => (started ? <RequiredMark /> : null);
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <form.Field name={`${prefix}.line1`} validators={{ onChange: liveRule(`${prefix}.line1`) }}>
          {(field) => (
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor={`${prefix}-line1`}>{mark("line1")} Address Line 1</FieldLabel>
              <Input
                id={`${prefix}-line1`}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={!!errorOf(field) || undefined}
              />
              <FieldError>{errorOf(field)}</FieldError>
            </Field>
          )}
        </form.Field>
        <form.Field name={`${prefix}.line2`}>
          {(field) => (
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor={`${prefix}-line2`}>Address Line 2</FieldLabel>
              <Input
                id={`${prefix}-line2`}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </Field>
          )}
        </form.Field>
        {(["city", "state"] as const).map((key) => (
          <form.Field
            key={key}
            name={`${prefix}.${key}`}
            validators={{ onChange: liveRule(`${prefix}.${key}`) }}
          >
            {(field) => (
              <Field>
                <FieldLabel htmlFor={`${prefix}-${key}`}>
                  {mark(key)} {key === "city" ? "City" : "State"}
                </FieldLabel>
                <Input
                  id={`${prefix}-${key}`}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={!!errorOf(field) || undefined}
                />
                <FieldError>{errorOf(field)}</FieldError>
              </Field>
            )}
          </form.Field>
        ))}
        <form.Field
          name={`${prefix}.country`}
          validators={{ onChange: liveRule(`${prefix}.country`) }}
        >
          {(field) => (
            <Field aria-invalid={!!errorOf(field) || undefined}>
              <FieldLabel htmlFor={`${prefix}-country`}>{mark("country")} Country</FieldLabel>
              <CountrySelect
                value={field.state.value}
                onValueChange={(code) => field.handleChange(code)}
              />
              <FieldError>{errorOf(field)}</FieldError>
            </Field>
          )}
        </form.Field>
        <form.Field
          name={`${prefix}.pincode`}
          validators={{ onChange: liveRule(`${prefix}.pincode`) }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor={`${prefix}-pincode`}>{mark("pincode")} Pincode</FieldLabel>
              <Input
                id={`${prefix}-pincode`}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={!!errorOf(field) || undefined}
              />
              <FieldError>{errorOf(field)}</FieldError>
            </Field>
          )}
        </form.Field>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-240 flex-col gap-0 overflow-hidden p-0">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-4 pr-14">
          <div>
            <DialogTitle>Create Payment Link</DialogTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Generate a payment link and share it with your customer.
            </p>
          </div>
        </div>

        <form.AppForm>
          <form.Form className="flex min-h-0 flex-1 flex-col">
            {/* Top-level workflow tabs. Only "Enter amount" is built, "Choose
             * what customers pay" is intentionally disabled rather than wired
             * to a guessed-at workflow, see CreatePaymentLinkModal's design
             * notes, both tabs and their TabsContent already exist so the
             * second workflow can be dropped in later without restructuring
             * this modal. */}
            <Tabs defaultValue="amount" className="flex min-h-0 flex-1 flex-col">
              <div className="shrink-0 border-b border-border px-6 py-3">
                <TabsList>
                  <TabsTrigger value="amount">Enter amount</TabsTrigger>
                  <TabsTrigger value="customer-pay" disabled title="Coming soon">
                    Choose what customers pay
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="amount" className="mt-0 flex min-h-0 flex-1 flex-col">
                <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto px-6 py-5 lg:grid-cols-[1fr_280px]">
                  <div className="flex flex-col gap-4">
                    {/* Primary interaction: currency + amount are the only
                     * mandatory fields, given the most prominent, centered
                     * placement so it's the first (and visually strongest)
                     * thing the merchant interacts with. Currency sits as a
                     * small chip above a large, borderless amount instead of
                     * the boxed currency+amount control this modal used to
                     * share for both fields, that fused-box treatment reads
                     * as two cramped inputs rather than one hero number. */}
                    <Card className="items-center gap-3 p-6 text-center">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <RequiredMark /> Amount to collect
                      </p>
                      <form.Field name="currency">
                        {(currencyField) => (
                          <Select
                            value={currencyField.state.value}
                            onValueChange={currencyField.handleChange}
                          >
                            <SelectTrigger className="h-7 w-fit min-w-0 gap-1 rounded-full border-border bg-muted/60 px-3 text-xs font-semibold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SUPPORTED_CURRENCIES.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </form.Field>

                      <form.Field name="amount" validators={{ onChange: liveRule("amount") }}>
                        {(amountField) => (
                          <>
                            <Input
                              id="amount"
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.01"
                              placeholder="0"
                              required
                              value={amountField.state.value}
                              aria-invalid={!!errorOf(amountField) || undefined}
                              onChange={(e) => amountField.handleChange(e.target.value)}
                              className="h-auto w-full border-0 bg-transparent p-0 text-center text-5xl font-bold tabular-nums text-primary shadow-none focus-visible:ring-0"
                            />
                            <FieldError>{errorOf(amountField)}</FieldError>
                          </>
                        )}
                      </form.Field>

                      <form.Field name="paymentDescription">
                        {(field) => (
                          <Field className="w-full max-w-65 text-left">
                            <FieldLabel htmlFor="paymentDescription">Description</FieldLabel>
                            <Input
                              id="paymentDescription"
                              placeholder="What is this payment for?"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                            />
                          </Field>
                        )}
                      </form.Field>
                    </Card>

                    {/* Everything else is optional context or behavior,
                     * collapsed by default so the initial form stays as
                     * lightweight as the amount+description above it. Compact
                     * toggle chips, not full-width expandable bars, clicking
                     * one reveals its fields in a card directly below the row. */}
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap gap-2">
                        {SECTIONS.map((section) => (
                          <SectionChip
                            key={section.key}
                            icon={section.icon}
                            label={section.label}
                            active={openSections.has(section.key)}
                            onClick={() => toggleSection(section.key)}
                          />
                        ))}
                      </div>

                      {openSections.has("customer") && (
                        <Card className="gap-4 p-5">
                          <h3 className="text-sm font-semibold text-foreground">
                            Customer details
                          </h3>
                          <form.Field name="referenceId">
                            {(field) => (
                              <Field>
                                <FieldLabel htmlFor="referenceId">Reference ID</FieldLabel>
                                <Input
                                  id="referenceId"
                                  placeholder="e.g. order #4471"
                                  value={field.state.value}
                                  onChange={(e) => field.handleChange(e.target.value)}
                                />
                              </Field>
                            )}
                          </form.Field>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <form.Field name="customerName">
                              {(field) => (
                                <Field>
                                  <FieldLabel htmlFor="customerName">Customer Name</FieldLabel>
                                  <Input
                                    id="customerName"
                                    value={field.state.value}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                  />
                                </Field>
                              )}
                            </form.Field>

                            <form.Field
                              name="customerEmail"
                              validators={{ onChange: liveRule("customerEmail") }}
                            >
                              {(field) => (
                                <Field>
                                  <FieldLabel htmlFor="customerEmail">
                                    {hasContactStarted && <RequiredMark />} Email Address
                                  </FieldLabel>
                                  <Input
                                    id="customerEmail"
                                    type="email"
                                    aria-invalid={!!errorOf(field) || undefined}
                                    value={field.state.value}
                                    onChange={(e) => {
                                      field.handleChange(e.target.value);
                                      applyNotifyDefaults({ customerEmail: e.target.value });
                                    }}
                                  />
                                  <FieldError>{errorOf(field)}</FieldError>
                                </Field>
                              )}
                            </form.Field>
                          </div>

                          <div className="grid grid-cols-[auto_1fr] gap-3">
                            <form.Field name="customerPhoneCountry">
                              {(countryField) => (
                                <Field>
                                  <FieldLabel htmlFor="customerPhoneCountry">Country</FieldLabel>
                                  <CountrySelect
                                    value={countryField.state.value}
                                    onValueChange={countryField.handleChange}
                                    showDialCode
                                    className="w-36"
                                  />
                                </Field>
                              )}
                            </form.Field>
                            <form.Field name="customerPhone">
                              {(field) => (
                                <Field>
                                  <FieldLabel htmlFor="customerPhone">
                                    {hasContactStarted && <RequiredMark />} Phone Number
                                  </FieldLabel>
                                  <Input
                                    id="customerPhone"
                                    type="tel"
                                    value={field.state.value}
                                    onChange={(e) => {
                                      field.handleChange(e.target.value);
                                      // The contact error sits under Email but covers
                                      // both, so re-check it once it is in play.
                                      const meta = form.getFieldMeta("customerEmail");
                                      if (meta?.isTouched || meta?.errors.length) {
                                        void form.validateField("customerEmail", "change");
                                      }
                                      applyNotifyDefaults({ customerPhone: e.target.value });
                                    }}
                                  />
                                </Field>
                              )}
                            </form.Field>
                          </div>
                        </Card>
                      )}

                      {openSections.has("billing") && (
                        <Card className="gap-4 p-5">
                          <h3 className="text-sm font-semibold text-foreground">Billing details</h3>
                          {addressFields("billing")}

                          <form.Field name="shippingSameAsBilling">
                            {(sameField) => (
                              <div className="border-t border-border pt-4">
                                <label className="flex items-center gap-2">
                                  <Checkbox
                                    checked={sameField.state.value}
                                    onCheckedChange={(checked) =>
                                      sameField.handleChange(checked === true)
                                    }
                                  />
                                  <span className="text-sm text-foreground">
                                    Shipping address is same as billing address
                                  </span>
                                </label>

                                {!sameField.state.value && (
                                  <div className="mt-3">
                                    <h3 className="text-sm font-semibold text-foreground">
                                      Shipping details
                                    </h3>
                                    <div className="mt-3">{addressFields("shipping")}</div>
                                  </div>
                                )}
                              </div>
                            )}
                          </form.Field>
                        </Card>
                      )}

                      {openSections.has("reminders") && (
                        <Card className="gap-4 p-5">
                          <h3 className="text-sm font-semibold text-foreground">Add reminders</h3>
                          <p className="text-xs text-muted-foreground">
                            Send payment link reminders to your customer through the channels
                            selected below.
                          </p>
                          <form.Subscribe
                            selector={(s) => [s.values.customerPhone, s.values.notifyVia] as const}
                          >
                            {([phone, notifyVia]) => (
                              <div className="flex flex-wrap gap-1.5">
                                {NOTIFY_CHANNELS.map((channel) => {
                                  const selected = notifyVia.includes(channel);
                                  const disabled = channel === "WhatsApp" && !hasValidPhone(phone);
                                  return (
                                    <Button
                                      key={channel}
                                      type="button"
                                      variant={selected ? "primary" : "outline"}
                                      size="sm"
                                      disabled={disabled}
                                      onClick={() => toggleNotify(channel)}
                                      className={cn(
                                        "h-auto rounded-full px-3 py-1 text-xs",
                                        selected
                                          ? "border-foreground bg-foreground text-background hover:bg-foreground/90"
                                          : "text-muted-foreground hover:text-foreground"
                                      )}
                                    >
                                      {channel}
                                    </Button>
                                  );
                                })}
                              </div>
                            )}
                          </form.Subscribe>
                        </Card>
                      )}

                      {openSections.has("expiry") && (
                        <Card className="gap-4 p-5">
                          <h3 className="text-sm font-semibold text-foreground">Expiry date</h3>
                          <form.Field name="expiryOption">
                            {(expiryField) => (
                              <div className="flex flex-col gap-3">
                                <SingleSelectChips
                                  options={EXPIRY_OPTIONS}
                                  value={expiryField.state.value}
                                  onChange={expiryField.handleChange}
                                />

                                {expiryField.state.value === "custom" && (
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <form.Field
                                      name="customExpiryDate"
                                      validators={{ onChange: liveRule("customExpiryDate") }}
                                    >
                                      {(dateField) => (
                                        <Field
                                          id="customExpiryDate"
                                          tabIndex={-1}
                                          className="outline-none"
                                          aria-invalid={!!errorOf(dateField) || undefined}
                                        >
                                          <FieldLabel>
                                            <RequiredMark /> Expiry date
                                          </FieldLabel>
                                          <DatePicker
                                            value={dateField.state.value}
                                            onChange={dateField.handleChange}
                                            min={todayDateKey}
                                          />
                                          <FieldError>{errorOf(dateField)}</FieldError>
                                        </Field>
                                      )}
                                    </form.Field>
                                    <form.Field
                                      name="customExpiryTime"
                                      validators={{ onChange: liveRule("customExpiryTime") }}
                                    >
                                      {(timeField) => (
                                        <Field
                                          id="customExpiryTime"
                                          tabIndex={-1}
                                          className="outline-none"
                                          aria-invalid={!!errorOf(timeField) || undefined}
                                        >
                                          <FieldLabel>
                                            <RequiredMark /> Expiry time
                                          </FieldLabel>
                                          <TimePicker
                                            value={timeField.state.value}
                                            onValueChange={timeField.handleChange}
                                          />
                                          <FieldError>{errorOf(timeField)}</FieldError>
                                        </Field>
                                      )}
                                    </form.Field>
                                  </div>
                                )}
                              </div>
                            )}
                          </form.Field>
                        </Card>
                      )}

                      {openSections.has("recurring") && (
                        <Card className="gap-4 p-5">
                          <h3 className="text-sm font-semibold text-foreground">
                            Recurring payment
                          </h3>
                          <form.Field name="recurringEnabled">
                            {(recurringField) => (
                              <>
                                <div className="flex items-center justify-between gap-4">
                                  <p className="text-sm font-medium text-foreground">
                                    Enable recurring payment
                                  </p>
                                  <Switch
                                    checked={recurringField.state.value}
                                    onCheckedChange={recurringField.handleChange}
                                  />
                                </div>

                                {recurringField.state.value && (
                                  <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4">
                                    <form.Field name="recurringFrequency">
                                      {(freqField) => (
                                        <div className="flex flex-col gap-2">
                                          <p className="text-sm text-foreground">Frequency</p>
                                          <SingleSelectChips
                                            options={FREQUENCY_OPTIONS}
                                            value={freqField.state.value}
                                            onChange={freqField.handleChange}
                                          />
                                        </div>
                                      )}
                                    </form.Field>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <form.Field
                                        name="recurringStartDate"
                                        validators={{ onChange: liveRule("recurringStartDate") }}
                                      >
                                        {(field) => (
                                          <Field
                                            id="recurringStartDate"
                                            tabIndex={-1}
                                            className="outline-none"
                                            aria-invalid={!!errorOf(field) || undefined}
                                          >
                                            <FieldLabel>
                                              <RequiredMark /> Start Date
                                            </FieldLabel>
                                            <DatePicker
                                              value={field.state.value}
                                              onChange={field.handleChange}
                                              min={todayDateKey}
                                            />
                                            <FieldError>{errorOf(field)}</FieldError>
                                          </Field>
                                        )}
                                      </form.Field>
                                      <form.Field
                                        name="recurringStartTime"
                                        validators={{ onChange: liveRule("recurringStartTime") }}
                                      >
                                        {(field) => (
                                          <Field
                                            id="recurringStartTime"
                                            tabIndex={-1}
                                            className="outline-none"
                                            aria-invalid={!!errorOf(field) || undefined}
                                          >
                                            <FieldLabel>
                                              <RequiredMark /> Start Time
                                            </FieldLabel>
                                            <TimePicker
                                              value={field.state.value}
                                              onValueChange={field.handleChange}
                                            />
                                            <FieldError>{errorOf(field)}</FieldError>
                                          </Field>
                                        )}
                                      </form.Field>
                                      <form.Field name="recurringEndDate">
                                        {(field) => (
                                          <Field
                                            id="recurringEndDate"
                                            tabIndex={-1}
                                            className="outline-none"
                                          >
                                            <FieldLabel>End Date</FieldLabel>
                                            <DatePicker
                                              value={field.state.value}
                                              onChange={field.handleChange}
                                              min={todayDateKey}
                                            />
                                          </Field>
                                        )}
                                      </form.Field>
                                      <form.Field name="recurringMaxPayments">
                                        {(field) => (
                                          <Field>
                                            <FieldLabel htmlFor="recurringMaxPayments">
                                              Maximum Number of Payments
                                            </FieldLabel>
                                            <Input
                                              id="recurringMaxPayments"
                                              type="number"
                                              min="1"
                                              value={field.state.value}
                                              onChange={(e) => field.handleChange(e.target.value)}
                                            />
                                          </Field>
                                        )}
                                      </form.Field>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </form.Field>

                          <form.Field name="notes">
                            {(field) => (
                              <Field>
                                <FieldLabel htmlFor="notes">Notes</FieldLabel>
                                <Textarea
                                  id="notes"
                                  rows={3}
                                  placeholder="Add internal notes for this payment. These notes should not be visible to customers."
                                  value={field.state.value}
                                  onChange={(e) => field.handleChange(e.target.value)}
                                />
                              </Field>
                            )}
                          </form.Field>
                        </Card>
                      )}
                    </div>
                  </div>

                  {/* Live summary, desktop only, moves below the form on narrower viewports via normal grid flow. */}
                  <div className="self-start lg:sticky lg:top-0">
                    <Card className="gap-4 p-4">
                      <h2 className="text-sm font-semibold text-foreground">
                        Payment link summary
                      </h2>
                      <form.Subscribe selector={(s) => s.values}>
                        {(values) => {
                          const hasAmount = Number(values.amount) > 0;
                          const notifyCount = values.notifyVia.length;
                          return (
                            <div className="flex flex-col gap-4">
                              <div>
                                <p className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
                                  {hasAmount
                                    ? formatCurrency(Number(values.amount), values.currency)
                                    : "₹0"}
                                </p>
                                <p className="text-xs font-medium text-muted-foreground">
                                  {values.currency}
                                </p>
                              </div>

                              {!hasAmount ? (
                                <p className="text-xs text-muted-foreground">
                                  Complete the required fields to create your payment link.
                                </p>
                              ) : (
                                <div className="flex flex-col divide-y divide-border">
                                  {values.paymentDescription.trim() && (
                                    <div className="py-2">
                                      <p className="text-xs text-muted-foreground">Payment for</p>
                                      <p className="mt-0.5 text-sm font-semibold text-foreground">
                                        {values.paymentDescription}
                                      </p>
                                    </div>
                                  )}

                                  <div className="py-2">
                                    <p className="text-xs text-muted-foreground">Customer</p>
                                    {values.customerName.trim() ? (
                                      <>
                                        <p className="mt-0.5 text-sm font-semibold text-foreground">
                                          {values.customerName}
                                        </p>
                                        {values.customerEmail.trim() && (
                                          <p className="text-xs text-muted-foreground">
                                            {values.customerEmail}
                                          </p>
                                        )}
                                      </>
                                    ) : (
                                      <p className="mt-0.5 text-sm font-semibold text-foreground">
                                        Not added
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between gap-4 py-2">
                                    <span className="text-xs text-muted-foreground">Expiry</span>
                                    <span className="text-sm font-semibold text-foreground">
                                      {expiryLabel(values)}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between gap-4 py-2">
                                    <span className="text-xs text-muted-foreground">Reminders</span>
                                    <span className="text-sm font-semibold text-foreground">
                                      {notifyCount > 0
                                        ? `${notifyCount} channel${notifyCount === 1 ? "" : "s"}`
                                        : "Off"}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between gap-4 py-2">
                                    <span className="text-xs text-muted-foreground">Recurring</span>
                                    <span className="text-sm font-semibold text-foreground">
                                      {values.recurringEnabled
                                        ? FREQUENCY_OPTIONS.find(
                                            (o) => o.value === values.recurringFrequency
                                          )?.label
                                        : "No"}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }}
                      </form.Subscribe>
                    </Card>

                    {/* Primary action lives here, right under the summary it
                     * reflects, more prominent than a sm footer button. */}
                    {/* Never disabled for missing fields: a press opens the
                     * section holding each gap and names it (onSubmitInvalid). */}
                    <form.SubmitButton
                      size="lg"
                      leftIcon={<Icon name="plus" className="h-4 w-4" />}
                      className="mt-3 w-full"
                    >
                      Create Payment Link
                    </form.SubmitButton>
                  </div>
                </div>
              </TabsContent>

              {/* Intentionally unreachable while its trigger is disabled, see
               * the note above the TabsList, kept so this workflow can be
               * built later without restructuring the modal. */}
              <TabsContent value="customer-pay" className="mt-0 flex-1" />
            </Tabs>

            <div className="flex shrink-0 items-center border-t border-border px-6 py-4">
              <Button type="button" variant="outline" size="sm" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </form.Form>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  );
}
