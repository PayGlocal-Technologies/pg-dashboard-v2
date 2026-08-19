"use client";

import { useState } from "react";
import { Button, Field, FieldDescription, FieldLabel, Input, Textarea } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

/**
 * Memo, notes and LUT.
 *
 * Nova has a memo and a footer. The API has `memo`, `notes` and `lut`, so the
 * footer maps to `notes` and LUT is added back — it is an export-compliance
 * reference (Letter of Undertaking) that Nova drops entirely and GST-exempt
 * export invoices need it printed on the document.
 */
export function NotesAndTermsSection({
  memo,
  notes,
  lut,
  onChange,
}: {
  memo: string;
  notes: string;
  lut: string;
  onChange: (patch: { memo?: string; notes?: string; lut?: string }) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Every field here is optional, so the section opens collapsed. The subtitle
  // says when something is in it, otherwise collapsing would hide typed content
  // with nothing on screen to say so.
  const filled = [memo, notes, lut].filter((value) => value.trim()).length;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <Button
        type="button"
        variant="ghost"
        className="h-auto w-full justify-between rounded-none px-5 py-4 text-left"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        rightIcon={
          <Icon
            name="chevron-down"
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180"
            )}
            aria-hidden
          />
        }
      >
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name="file-text" className="h-4 w-4" />
          </span>
          <span className="block">
            <span className="block text-[15px] font-semibold text-foreground">Notes and terms</span>
            <span className="block text-[12px] font-normal text-muted-foreground">
              {filled ? `${filled} of 3 filled in` : "Memo, notes and LUT"}
            </span>
          </span>
        </span>
      </Button>

      {expanded && (
        <div className="space-y-3 border-t border-border px-5 py-5">
          <Field>
            <FieldLabel htmlFor="invoice-memo">Memo</FieldLabel>
            <Textarea
              id="invoice-memo"
              rows={2}
              placeholder="A short line shown under the amount, e.g. what this invoice covers"
              value={memo}
              onChange={(e) => onChange({ memo: e.target.value })}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="invoice-notes">Notes</FieldLabel>
            <Textarea
              id="invoice-notes"
              rows={3}
              placeholder="Terms, payment instructions, or anything else printed at the foot of the invoice"
              value={notes}
              onChange={(e) => onChange({ notes: e.target.value })}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="invoice-lut">LUT</FieldLabel>
            <Input
              id="invoice-lut"
              placeholder="Optional"
              value={lut}
              onChange={(e) => onChange({ lut: e.target.value })}
            />
            <FieldDescription>
              Letter of Undertaking reference, printed on export invoices supplied without payment
              of IGST.
            </FieldDescription>
          </Field>
        </div>
      )}
    </div>
  );
}
