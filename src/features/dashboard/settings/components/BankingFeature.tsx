"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  Field,
  FieldError,
  FieldLabel,
  Input,
  PageHeader,
  Shimmer,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { useSettlementDetails, useUpdateAccountDetails } from "@/features/dashboard/settings/hooks";

// Indian IFSC: 4 letters, a 0, then 6 alphanumerics. The API also does its own
// IFSC lookup and 4xxs with "Invalid IFSC code" — this is just the client gate.
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_RE = /^\d{9,18}$/;

// This card is compact: max-w-sm, size="sm" buttons (h-9, text-xs) and text-xs
// values. Flux's Input defaults to h-11/text-[15px] and FieldLabel to text-sm,
// which made the card jump a type scale and ~150px in height the moment Edit
// was clicked. These scale the edit form to the card's own density instead.
const COMPACT_FIELD = "gap-1.5";
const COMPACT_LABEL = "text-xs font-medium text-muted-foreground";
const COMPACT_INPUT = "h-9 min-h-9 px-3 text-xs placeholder:font-sans";
const COMPACT_ERROR = "text-xs";

export function BankingFeature() {
  // Eye toggle, exactly as pg-dashboard's SettlementDetails: masked reads the
  // /settlement endpoint, unmasked swaps to /settlement-details. Starts masked.
  const [masked, setMasked] = useState(true);
  const { settlement, isLoading } = useSettlementDetails(masked);

  const [editing, setEditing] = useState(false);
  const { updateAccount, isSaving, canEdit } = useUpdateAccountDetails();

  // The secure endpoint returns the full number under `accountNumber`, the
  // masked one under `maskedAccountNumber` — prefer whichever the current
  // response carries (see SettlementData).
  const accountNumber = settlement?.accountNumber ?? settlement?.maskedAccountNumber ?? "—";
  const ifscCode = settlement?.ifscCode ?? "—";

  const form = useForm({
    defaultValues: { number: "", ifscCode: "" },
    onSubmit: ({ value }) => {
      updateAccount(
        { number: value.number.trim(), ifscCode: value.ifscCode.trim().toUpperCase() },
        {
          onSuccess: () => {
            toast.success("Bank account updated successfully.");
            setEditing(false);
            setMasked(true); // refetch the masked read the invalidation just cleared
          },
          onError: (err: Error) => toast.error(err.message || "Failed to update bank account."),
        }
      );
    },
  });

  const startEditing = (): void => {
    // Account number is never prefilled — the read is masked and the full value
    // should be re-entered deliberately. IFSC is safe to prefill.
    form.reset({ number: "", ifscCode: ifscCode !== "—" ? ifscCode : "" });
    setEditing(true);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Account details" subtitle="Where we send settled funds by currency." />

      <Card className="w-full max-w-md gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon name="landmark" size={18} />
            </span>
            {/* No bank name here: the settlement endpoints return only the
                account number and IFSC (same as pg-dashboard's Settlement
                Details), so there is nothing to render it from. */}
            <p className="text-sm font-bold text-foreground">Settlement account</p>
          </div>
          {/* BACKEND GAP: settlement endpoint carries no primary/multi-account
              flag, so this label is not backed by real data yet. */}
          <Badge variant="default" size="sm">
            Primary
          </Badge>
        </div>

        <div>
          {editing ? (
            <form
              className="mt-2 space-y-2.5"
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void form.handleSubmit();
              }}
            >
              <form.Field
                name="number"
                validators={{
                  onSubmit: ({ value }) =>
                    ACCOUNT_RE.test(value.trim())
                      ? undefined
                      : "Enter a valid account number (9–18 digits)",
                }}
              >
                {(field) => (
                  <Field className={COMPACT_FIELD}>
                    <FieldLabel htmlFor="account-number" className={COMPACT_LABEL}>
                      Account number
                    </FieldLabel>
                    <Input
                      id="account-number"
                      inputMode="numeric"
                      placeholder="Enter new account number"
                      value={field.state.value}
                      aria-invalid={field.state.meta.errors.length > 0}
                      onChange={(e) => field.handleChange(e.target.value.replace(/\D/g, ""))}
                      onBlur={field.handleBlur}
                      className={cn(COMPACT_INPUT, "font-mono tabular-nums")}
                    />
                    <FieldError className={COMPACT_ERROR}>{field.state.meta.errors[0]}</FieldError>
                  </Field>
                )}
              </form.Field>

              <form.Field
                name="ifscCode"
                validators={{
                  onSubmit: ({ value }) =>
                    IFSC_RE.test(value.trim().toUpperCase())
                      ? undefined
                      : "Enter a valid IFSC code",
                }}
              >
                {(field) => (
                  <Field className={COMPACT_FIELD}>
                    <FieldLabel htmlFor="ifsc-code" className={COMPACT_LABEL}>
                      IFSC code
                    </FieldLabel>
                    <Input
                      id="ifsc-code"
                      placeholder="e.g. HDFC0000123"
                      value={field.state.value}
                      aria-invalid={field.state.meta.errors.length > 0}
                      onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
                      onBlur={field.handleBlur}
                      className={cn(COMPACT_INPUT, "font-mono")}
                    />
                    <FieldError className={COMPACT_ERROR}>{field.state.meta.errors[0]}</FieldError>
                  </Field>
                )}
              </form.Field>

              <div className="flex gap-2">
                <Button type="submit" size="sm" isLoading={isSaving} disabled={!canEdit}>
                  Save changes
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <>
              {/* Account number and IFSC grouped as one labelled pair, not two
                  loose lines — the label-above-value pattern the rest of
                  Settings uses (SettingsDetailRow), inside its own muted
                  panel so the two facts read as one unit. */}
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/40 p-3">
                <div>
                  <p className="text-[11px] text-muted-foreground">Account number</p>
                  {/* Masked by default with an eye toggle to reveal — the
                      real /settlement vs /settlement-details switch. */}
                  <div className="mt-0.5 flex items-center gap-1">
                    {isLoading ? (
                      <Shimmer className="h-4 w-24" />
                    ) : (
                      <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
                        {accountNumber}
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={masked ? "Reveal account number" : "Hide account number"}
                      className="h-6 min-h-0 w-6 shrink-0 p-0"
                      onClick={() => setMasked((prev) => !prev)}
                    >
                      <Icon name={masked ? "eye" : "eye-off"} className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] text-muted-foreground">IFSC code</p>
                  <p className="mt-0.5 font-mono text-xs font-semibold text-foreground">
                    {ifscCode}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="link"
                size="sm"
                className="mt-3 h-auto min-h-0 p-0 text-[13px] font-medium"
                onClick={startEditing}
                disabled={!canEdit}
              >
                Edit
              </Button>
            </>
          )}
        </div>

        {/* BACKEND GAP: account type, settlement currency and a multi-account
            list have no endpoint yet — the /settlement response is only
            IFSC + masked account number. */}
        <p className="border-t border-border pt-3 text-[11px] text-muted-foreground">
          Account type, currency and additional accounts are not yet available.
        </p>
      </Card>
    </div>
  );
}
