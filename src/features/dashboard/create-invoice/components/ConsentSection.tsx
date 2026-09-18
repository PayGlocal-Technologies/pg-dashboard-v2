"use client";

import { useState } from "react";
import { Button, Checkbox } from "@/components/ui";
import { cn } from "@/lib/utils";
import { CONSENT_TEXT } from "@/features/dashboard/create-invoice/constants";

/**
 * The attestation that gates invoice generation.
 *
 * Nova has no equivalent. This is not decoration: PayGlocal acts only as a
 * technology platform and does not verify what the merchant submits, so the
 * merchant has to confirm the content is accurate before a document goes out.
 * Wording is copied verbatim from pg-dashboard's DateDetails step, including
 * the separate variant used when the invoice is being attached to a
 * transaction, which additionally authorises that linking.
 */
export function ConsentSection({
  checked,
  isLinkedToTransaction,
  onChange,
}: {
  checked: boolean;
  isLinkedToTransaction: boolean;
  onChange: (checked: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    // This gates the whole submit, so an unticked box is styled as something
    // still to do rather than as a muted footnote: it carries the primary tint
    // until it is ticked, then recedes to a plain card. The previous bg-muted/20
    // put an unticked control on a near-invisible surface.
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors",
        checked ? "border-border bg-card shadow-sm" : "border-primary/45 bg-primary/5"
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          id="invoice-consent"
          checked={checked}
          onCheckedChange={(next) => onChange(next === true)}
          className="mt-0.5 size-5"
        />
        <label htmlFor="invoice-consent" className="cursor-pointer text-[12.5px] text-foreground">
          {isLinkedToTransaction ? CONSENT_TEXT.linked : CONSENT_TEXT.standard}
          {expanded && <> {CONSENT_TEXT.expanded}</>}{" "}
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 align-baseline text-[12.5px]"
            onClick={(e) => {
              // The label wraps this, so a bare click would also toggle the box.
              e.preventDefault();
              setExpanded((value) => !value);
            }}
          >
            {expanded ? "Show less" : "Show more"}
          </Button>
        </label>
      </div>
    </div>
  );
}
