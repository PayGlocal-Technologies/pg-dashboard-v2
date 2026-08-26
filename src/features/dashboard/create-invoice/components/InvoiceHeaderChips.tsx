"use client";

import { useState, type ReactNode } from "react";
import {
  Button,
  Calendar,
  DatePicker,
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/format";
import { DUE_TERM_OPTIONS } from "@/features/dashboard/create-invoice/constants";

/**
 * Local YYYY-MM-DD, not `toISOString().slice(0, 10)` — that converts to UTC
 * first, which rolls the date back a day for any IST time before 05:30.
 */
export function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Adds `days` to a YYYY-MM-DD key and returns another YYYY-MM-DD key. */
export function addDaysToDateKey(fromKey: string, days: number): string {
  const date = new Date(`${fromKey}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function dueDateForTerm(issueDate: string, termId: string | null): string {
  if (!termId || termId === "custom") return "";
  const term = DUE_TERM_OPTIONS.find((t) => t.id === termId);
  return term ? addDaysToDateKey(issueDate, term.days) : "";
}

function Chip({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/80",
            className
          )}
        >
          {label}
          <Icon name="pencil" className="h-3 w-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        {children}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Invoice number.
 *
 * The server issues a number when the draft is first created, and it is
 * pre-filled here. Production wraps that in an Auto generate / Enter manually
 * radio pair, but the pair carries no meaning: "auto" does not defer anything
 * to the server — the number already exists — it only re-fills the field and
 * disables it. Nothing about the choice reaches the API either, which sends
 * `invoiceNumber` and nothing else (pg-dashboard names an `invoiceNumberType`
 * field but never reads or submits it).
 *
 * So the field is simply editable: leaving it is auto, typing is manual. The
 * one thing the radios did offer — getting the issued number back after
 * overtyping it — survives as a restore action, shown only once the two differ.
 */
export function InvoiceNumberChip({
  value,
  serverValue,
  onChange,
}: {
  value: string;
  /** The number the server issued, offered back once the field diverges. */
  serverValue: string;
  onChange: (value: string) => void;
}) {
  const isEdited = !!serverValue && value !== serverValue;

  return (
    <Chip label={value || "Invoice number"}>
      <Field>
        <FieldLabel htmlFor="invoice-number-input">Invoice number</FieldLabel>
        <Input
          id="invoice-number-input"
          value={value}
          placeholder="BHM-INV-25-0003"
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-[13.5px]"
        />
        <FieldDescription>
          {isEdited ? (
            <>
              Generated as{" "}
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 align-baseline text-[12px] font-mono"
                onClick={() => onChange(serverValue)}
              >
                {serverValue}
              </Button>
              . Click to restore it.
            </>
          ) : (
            "Generated for you. Edit it to use your own numbering."
          )}
        </FieldDescription>
      </Field>
    </Chip>
  );
}

/**
 * Issue date.
 *
 * Production disallows post-dating it (`disabledDate: current > today`). flux's
 * DatePicker only takes a `min`, so this drops to the Calendar primitive
 * underneath it, where `disabled={{ after: today }}` makes the rule real rather
 * than advisory — a future date cannot be picked at all.
 */
export function IssueDateChip({
  value,
  maxDate,
  onChange,
}: {
  value: string;
  /** Latest selectable day, as a YYYY-MM-DD key. Today, in practice. */
  maxDate: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = value
    ? formatDate(value, { day: "2-digit", month: "short", year: "numeric" })
    : "Issue date";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/80"
        >
          {label}
          <Icon name="pencil" className="h-3 w-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <Calendar
          mode="single"
          selected={value ? new Date(`${value}T00:00:00`) : undefined}
          disabled={{ after: new Date(`${maxDate}T00:00:00`) }}
          onSelect={(date?: Date) => {
            if (!date) return;
            onChange(toDateKey(date));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function dueLabel(termId: string | null, dueDate: string): string {
  if (!termId) return "";
  if (termId === "custom") {
    return dueDate
      ? `Due on ${formatDate(dueDate, { day: "2-digit", month: "short", year: "numeric" })}`
      : "";
  }
  const term = DUE_TERM_OPTIONS.find((t) => t.id === termId);
  if (!term) return "";
  if (term.id === "today") return "Due today";
  if (term.id === "tomorrow") return "Due tomorrow";
  return `Due in ${term.days} days`;
}

/**
 * Due date, as a term picker rather than a bare calendar.
 *
 * Only the resolved date reaches the API — there is no field for the term — so
 * a reopened draft falls back to showing the explicit date.
 */
export function DueDateChip({
  termId,
  dueDate,
  minDate,
  onTermChange,
  onCustomDateChange,
}: {
  termId: string | null;
  dueDate: string;
  /** Due date cannot precede the issue date. */
  minDate: string;
  onTermChange: (termId: string) => void;
  onCustomDateChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = dueLabel(termId, dueDate);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {label ? (
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/80"
          >
            {label}
            <Icon name="pencil" className="h-3 w-3 text-muted-foreground" />
          </button>
        ) : (
          <button
            type="button"
            className="flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
          >
            <Icon name="plus" className="h-3.5 w-3.5" />
            Add due date
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent align="start" className="w-60 p-1.5">
        {DUE_TERM_OPTIONS.map((term) => (
          <button
            key={term.id}
            type="button"
            onClick={() => {
              onTermChange(term.id);
              setOpen(false);
            }}
            className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-muted/60"
          >
            {term.label}
            {term.id === termId && <Icon name="check" className="h-3.5 w-3.5 text-primary" />}
          </button>
        ))}

        <div className="my-1 border-t border-border" />

        {termId === "custom" ? (
          <div className="px-1 py-1">
            <DatePicker
              value={dueDate}
              min={minDate}
              onChange={(value) => {
                onCustomDateChange(value);
                setOpen(false);
              }}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onTermChange("custom")}
            className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-muted/60"
          >
            Custom
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
