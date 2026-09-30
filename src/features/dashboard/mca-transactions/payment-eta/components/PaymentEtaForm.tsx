"use client";

import { useForm } from "@tanstack/react-form";
import {
  Button,
  DatePicker,
  Field,
  FieldLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import {
  ETA_ACCOUNTS,
  ETA_CURRENCIES,
  ETA_PAYMENT_MODES,
  ETA_SUPPORT_EMAIL,
  type EtaCurrency,
  type EtaPaymentMode,
} from "@/features/dashboard/mca-transactions/payment-eta/constants";
import {
  etaBlocker,
  type EtaFormValues,
} from "@/features/dashboard/mca-transactions/payment-eta/eta";

const FIELD_TRIGGER = "h-11 w-full";

/**
 * The four questions. Seeded from `initialValues`, so coming back from the
 * result via the pencil shows exactly what was entered. Whether Continue is
 * allowed is `etaBlocker(values)`, read live, so the inline warning and the
 * disabled button can't drift apart.
 */
export function PaymentEtaForm({
  initialValues,
  todayKey,
  onSubmit,
}: {
  initialValues: EtaFormValues;
  todayKey: string;
  onSubmit: (values: EtaFormValues) => void;
}) {
  const form = useForm({
    defaultValues: initialValues,
    onSubmit: ({ value }) => {
      if (etaBlocker(value) === null) onSubmit(value);
    },
  });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-6 sm:px-8">
        <form.Field name="initiatedDate">
          {(field) => (
            <Field>
              <FieldLabel htmlFor="eta-initiated-date">
                When did your client initiate the payment?
              </FieldLabel>
              {/* Can't be later than today: a payment not yet sent has no ETA
                  to check. */}
              <div id="eta-initiated-date">
                <DatePicker
                  value={field.state.value}
                  onChange={field.handleChange}
                  max={todayKey}
                  placeholder="Select date"
                  className={FIELD_TRIGGER}
                />
              </div>
            </Field>
          )}
        </form.Field>

        <form.Field name="currency">
          {(field) => (
            <Field>
              <FieldLabel htmlFor="eta-currency">Payment currency</FieldLabel>
              <Select
                value={field.state.value}
                onValueChange={(v) => field.handleChange(v as EtaCurrency)}
              >
                <SelectTrigger id="eta-currency" className={FIELD_TRIGGER}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ETA_CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="flex items-center gap-2">
                        <CountryFlag iso2={c.iso2} alt="" />
                        <span className="font-medium">{c.code}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>

        <form.Field name="accountId">
          {(field) => {
            const selected = ETA_ACCOUNTS.find((a) => a.id === field.state.value);
            return (
              <Field>
                <FieldLabel htmlFor="eta-account">Which account did you share?</FieldLabel>
                <Select value={field.state.value} onValueChange={field.handleChange}>
                  <SelectTrigger id="eta-account" className={FIELD_TRIGGER}>
                    {/* One line in the closed field; the full three-line row is
                        for choosing, in the list. */}
                    <SelectValue placeholder="Select account">
                      {selected && (
                        <span className="flex min-w-0 items-center gap-2">
                          <Icon
                            name="landmark"
                            size={14}
                            className="shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                          <span className="truncate">{selected.bankName}</span>
                          <span className="shrink-0 text-muted-foreground">
                            · {selected.accountType}
                          </span>
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ETA_ACCOUNTS.map((account) => (
                      <SelectItem key={account.id} value={account.id} className="py-2">
                        <span className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <Icon name="landmark" size={15} aria-hidden />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-foreground">
                              {account.bankName}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {account.accountType}
                            </span>
                            <span className="block text-xs tabular-nums text-muted-foreground">
                              Account number: {account.maskedNumber}
                            </span>
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="paymentMode">
          {(field) => (
            <Field>
              <FieldLabel htmlFor="eta-mode">Mode of payment</FieldLabel>
              <Select
                value={field.state.value}
                onValueChange={(v) => field.handleChange(v as EtaPaymentMode)}
              >
                <SelectTrigger id="eta-mode" className={FIELD_TRIGGER}>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  {ETA_PAYMENT_MODES.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {field.state.value === "other" && (
                <div
                  role="alert"
                  className="mt-2 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 animate-in fade-in duration-150 dark:border-red-500/40 dark:bg-red-500/10"
                >
                  <Icon
                    name="alert-circle"
                    size={16}
                    className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
                    aria-hidden
                  />
                  <p className="text-[13px] leading-relaxed text-foreground">
                    Payments via other modes aren&apos;t supported on this account. Such payments
                    are returned to source if debited. Please reach out to{" "}
                    <a
                      href={`mailto:${ETA_SUPPORT_EMAIL}`}
                      className="font-medium text-primary underline underline-offset-2"
                    >
                      {ETA_SUPPORT_EMAIL}
                    </a>{" "}
                    for further assistance.
                  </p>
                </div>
              )}
            </Field>
          )}
        </form.Field>
      </div>

      <div className="flex justify-end border-t border-border px-6 py-4 sm:px-8">
        <form.Subscribe selector={(state) => etaBlocker(state.values)}>
          {(blocker) => (
            <Button
              type="submit"
              variant="primary"
              disabled={blocker !== null}
              rightIcon={<Icon name="arrow-right" size={15} aria-hidden />}
              className="w-full sm:w-auto sm:px-6 disabled:border-transparent disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 disabled:shadow-none"
            >
              Continue
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
