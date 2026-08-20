"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
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

const EMPTY_ADDRESS: AddressValues = { line1: "", line2: "", city: "", state: "", country: "", pincode: "" };

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
  return !!(a.line1.trim() && a.city.trim() && a.state.trim() && a.country.trim() && a.pincode.trim());
}

function hasValidPhone(phone: string): boolean {
  return phone.replace(/\D/g, "").length >= 7;
}

function isAddressEmpty(a: AddressValues): boolean {
  return !a.line1.trim() && !a.city.trim() && !a.state.trim() && !a.country.trim() && !a.pincode.trim();
}

function computeIsValid(v: CreatePaymentLinkFormValues): boolean {
  const amountValid = Number(v.amount) > 0;
  const hasContact = v.customerEmail.trim().length > 0 || hasValidPhone(v.customerPhone);
  const billingValid = isAddressEmpty(v.billing) || isAddressComplete(v.billing);
  const shippingValid = v.shippingSameAsBilling || isAddressEmpty(v.shipping) || isAddressComplete(v.shipping);
  const recurringValid =
    !v.recurringEnabled || Boolean(v.recurringFrequency && v.recurringStartDate && v.recurringStartTime);
  const expiryValid = v.expiryOption !== "custom" || Boolean(v.customExpiryDate && v.customExpiryTime);

  // Amount + currency are the only mandatory fields for this workflow, see
  // the modal's "Enter amount" tab, every other section below is optional
  // and only gates submission once the merchant has actually started
  // filling it in (a half-finished address blocks submit, an untouched one
  // does not).
  return Boolean(
    amountValid &&
      (!v.customerName.trim() || hasContact) &&
      billingValid &&
      shippingValid &&
      recurringValid &&
      expiryValid
  );
}

function expiryLabel(v: CreatePaymentLinkFormValues): string {
  const preset = EXPIRY_OPTIONS.find((o) => o.value === v.expiryOption);
  if (v.expiryOption !== "custom") return preset?.label ?? "7 Days";
  return v.customExpiryDate ? `${v.customExpiryDate} ${v.customExpiryTime || ""}`.trim() : "Custom date";
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

interface AddressFieldsProps {
  values: AddressValues;
  onChange: (next: AddressValues) => void;
  idPrefix: string;
}

function AddressFields({ values, onChange, idPrefix }: AddressFieldsProps) {
  function set(key: keyof AddressValues, value: string) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor={`${idPrefix}-line1`}>Address Line 1</FieldLabel>
        <Input id={`${idPrefix}-line1`} value={values.line1} onChange={(e) => set("line1", e.target.value)} />
      </Field>
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor={`${idPrefix}-line2`}>Address Line 2</FieldLabel>
        <Input id={`${idPrefix}-line2`} value={values.line2} onChange={(e) => set("line2", e.target.value)} />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-city`}>City</FieldLabel>
        <Input id={`${idPrefix}-city`} value={values.city} onChange={(e) => set("city", e.target.value)} />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-state`}>State</FieldLabel>
        <Input id={`${idPrefix}-state`} value={values.state} onChange={(e) => set("state", e.target.value)} />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-country`}>Country</FieldLabel>
        <CountrySelect value={values.country} onValueChange={(code) => set("country", code)} />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-pincode`}>Pincode</FieldLabel>
        <Input id={`${idPrefix}-pincode`} value={values.pincode} onChange={(e) => set("pincode", e.target.value)} />
      </Field>
    </div>
  );
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
            value === opt.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
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

export function CreatePaymentLinkModal({ open, onOpenChange, onCreated }: CreatePaymentLinkModalProps) {
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

  const form = useForm({
    defaultValues: DEFAULT_VALUES,
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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="flex min-h-0 flex-1 flex-col"
          noValidate
        >
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
                      Amount to collect
                    </p>
                    <form.Field name="currency">
                      {(currencyField) => (
                        <Select value={currencyField.state.value} onValueChange={currencyField.handleChange}>
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

                    <form.Field name="amount">
                      {(amountField) => (
                        <Input
                          id="amount"
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          required
                          value={amountField.state.value}
                          onChange={(e) => amountField.handleChange(e.target.value)}
                          className="h-auto w-full border-0 bg-transparent p-0 text-center text-5xl font-bold tabular-nums text-primary shadow-none focus-visible:ring-0"
                        />
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
                        <h3 className="text-sm font-semibold text-foreground">Customer details</h3>
                        <form.Field name="referenceId">
                          {(field) => (
                            <Field>
                              <FieldLabel htmlFor="referenceId">Reference ID (optional)</FieldLabel>
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

                          <form.Field name="customerEmail">
                            {(field) => (
                              <Field>
                                <FieldLabel htmlFor="customerEmail">Email Address</FieldLabel>
                                <Input
                                  id="customerEmail"
                                  type="email"
                                  value={field.state.value}
                                  onChange={(e) => {
                                    field.handleChange(e.target.value);
                                    applyNotifyDefaults({ customerEmail: e.target.value });
                                  }}
                                />
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
                                <FieldLabel htmlFor="customerPhone">Phone Number</FieldLabel>
                                <Input
                                  id="customerPhone"
                                  type="tel"
                                  value={field.state.value}
                                  onChange={(e) => {
                                    field.handleChange(e.target.value);
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
                        <form.Field name="billing">
                          {(field) => (
                            <AddressFields values={field.state.value} onChange={field.handleChange} idPrefix="billing" />
                          )}
                        </form.Field>

                        <form.Field name="shippingSameAsBilling">
                          {(sameField) => (
                            <div className="border-t border-border pt-4">
                              <label className="flex items-center gap-2">
                                <Checkbox
                                  checked={sameField.state.value}
                                  onCheckedChange={(checked) => sameField.handleChange(checked === true)}
                                />
                                <span className="text-sm text-foreground">
                                  Shipping address is same as billing address
                                </span>
                              </label>

                              {!sameField.state.value && (
                                <div className="mt-3">
                                  <h3 className="text-sm font-semibold text-foreground">Shipping details</h3>
                                  <form.Field name="shipping">
                                    {(field) => (
                                      <div className="mt-3">
                                        <AddressFields
                                          values={field.state.value}
                                          onChange={field.handleChange}
                                          idPrefix="shipping"
                                        />
                                      </div>
                                    )}
                                  </form.Field>
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
                          Send payment link reminders to your customer through the channels selected below.
                        </p>
                        <form.Subscribe selector={(s) => [s.values.customerPhone, s.values.notifyVia] as const}>
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
                                  <form.Field name="customExpiryDate">
                                    {(dateField) => (
                                      <DatePicker
                                        label="Expiry date"
                                        value={dateField.state.value}
                                        onChange={dateField.handleChange}
                                        min={todayDateKey}
                                      />
                                    )}
                                  </form.Field>
                                  <form.Field name="customExpiryTime">
                                    {(timeField) => (
                                      <TimePicker
                                        label="Expiry time"
                                        value={timeField.state.value}
                                        onValueChange={timeField.handleChange}
                                      />
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
                        <h3 className="text-sm font-semibold text-foreground">Recurring payment</h3>
                        <form.Field name="recurringEnabled">
                          {(recurringField) => (
                            <>
                              <div className="flex items-center justify-between gap-4">
                                <p className="text-sm font-medium text-foreground">Enable recurring payment</p>
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
                                    <form.Field name="recurringStartDate">
                                      {(field) => (
                                        <DatePicker
                                          label="Start Date"
                                          value={field.state.value}
                                          onChange={field.handleChange}
                                          min={todayDateKey}
                                        />
                                      )}
                                    </form.Field>
                                    <form.Field name="recurringStartTime">
                                      {(field) => (
                                        <TimePicker
                                          label="Start Time"
                                          value={field.state.value}
                                          onValueChange={field.handleChange}
                                        />
                                      )}
                                    </form.Field>
                                    <form.Field name="recurringEndDate">
                                      {(field) => (
                                        <DatePicker
                                          label="End Date (optional)"
                                          value={field.state.value}
                                          onChange={field.handleChange}
                                          min={todayDateKey}
                                        />
                                      )}
                                    </form.Field>
                                    <form.Field name="recurringMaxPayments">
                                      {(field) => (
                                        <Field>
                                          <FieldLabel htmlFor="recurringMaxPayments">
                                            Maximum Number of Payments (optional)
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
                    <h2 className="text-sm font-semibold text-foreground">Payment link summary</h2>
                    <form.Subscribe selector={(s) => s.values}>
                      {(values) => {
                        const hasAmount = Number(values.amount) > 0;
                        const notifyCount = values.notifyVia.length;
                        return (
                          <div className="flex flex-col gap-4">
                            <div>
                              <p className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
                                {hasAmount ? formatCurrency(Number(values.amount), values.currency) : "₹0"}
                              </p>
                              <p className="text-xs font-medium text-muted-foreground">{values.currency}</p>
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
                                        <p className="text-xs text-muted-foreground">{values.customerEmail}</p>
                                      )}
                                    </>
                                  ) : (
                                    <p className="mt-0.5 text-sm font-semibold text-foreground">Not added</p>
                                  )}
                                </div>

                                <div className="flex items-center justify-between gap-4 py-2">
                                  <span className="text-xs text-muted-foreground">Expiry</span>
                                  <span className="text-sm font-semibold text-foreground">{expiryLabel(values)}</span>
                                </div>

                                <div className="flex items-center justify-between gap-4 py-2">
                                  <span className="text-xs text-muted-foreground">Reminders</span>
                                  <span className="text-sm font-semibold text-foreground">
                                    {notifyCount > 0 ? `${notifyCount} channel${notifyCount === 1 ? "" : "s"}` : "Off"}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between gap-4 py-2">
                                  <span className="text-xs text-muted-foreground">Recurring</span>
                                  <span className="text-sm font-semibold text-foreground">
                                    {values.recurringEnabled
                                      ? FREQUENCY_OPTIONS.find((o) => o.value === values.recurringFrequency)?.label
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
                  <form.Subscribe selector={(s) => [s.values, s.isSubmitting] as const}>
                    {([values, isSubmitting]) => (
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        disabled={!computeIsValid(values) || isSubmitting}
                        leftIcon={<Icon name="plus" className="h-4 w-4" />}
                        className="mt-3 w-full"
                      >
                        Create Payment Link
                      </Button>
                    )}
                  </form.Subscribe>
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
        </form>
      </DialogContent>
    </Dialog>
  );
}
