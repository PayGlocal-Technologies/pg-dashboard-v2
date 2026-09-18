"use client";

import {
  DatePicker,
  Field,
  FieldDescription,
  FieldLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { RECURRING_OPTIONS } from "@/features/dashboard/create-invoice/constants";
import type { RecurringType } from "@/features/dashboard/create-invoice/types";

/**
 * Recurring schedule.
 *
 * The frequencies are the API's enum, not Nova's. Nova offers weekly, monthly,
 * quarterly and yearly; the server accepts two-weekly, monthly, two-monthly and
 * quarterly. Offering Nova's set would send values the server rejects, so the
 * UI is bound to what can actually be stored. Widening it is a backend change.
 */
export function RecurringSection({
  isRecurring,
  recurringType,
  recurringStartDate,
  minStartDate,
  onChange,
}: {
  isRecurring: boolean;
  recurringType: RecurringType | "";
  recurringStartDate: string;
  /** Recurrence cannot start in the past. */
  minStartDate: string;
  onChange: (patch: {
    isRecurring?: boolean;
    recurringType?: RecurringType | "";
    recurringStartDate?: string;
  }) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name="repeat" className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Recurring invoice</h2>
            <p className="text-[12px] text-muted-foreground">
              Re-issue this invoice automatically on a schedule.
            </p>
          </div>
        </div>

        <Switch
          checked={isRecurring}
          onCheckedChange={(checked) =>
            onChange(
              checked
                ? { isRecurring: true }
                : // Clear the schedule when switching off, so a stale frequency
                  // is not persisted on a one-off invoice.
                  { isRecurring: false, recurringType: "", recurringStartDate: "" }
            )
          }
          aria-label="Make this a recurring invoice"
        />
      </div>

      {isRecurring && (
        <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="recurring-frequency">Frequency</FieldLabel>
            <Select
              value={recurringType}
              onValueChange={(next) => onChange({ recurringType: next as RecurringType })}
            >
              <SelectTrigger id="recurring-frequency" className="w-full">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                {RECURRING_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="recurring-start">Start date</FieldLabel>
            <DatePicker
              value={recurringStartDate}
              min={minStartDate}
              onChange={(next) => onChange({ recurringStartDate: next })}
            />
            <FieldDescription>The first repeat is issued on this date.</FieldDescription>
          </Field>
        </div>
      )}
    </div>
  );
}
