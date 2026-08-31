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
import { useApp } from "@/stores/useApp";
import { useSettlementDetails, useUpdateAccountDetails } from "@/features/dashboard/settings/hooks";

// Indian IFSC: 4 letters, a 0, then 6 alphanumerics. The API also does its own
// IFSC lookup and 4xxs with "Invalid IFSC code" — this is just the client gate.
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_RE = /^\d{9,18}$/;

export function BankingFeature() {
  const profile = useApp((s) => s.profile);
  const bankName = profile?.bankName ?? "Not available";

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
          onError: (err: Error) =>
            toast.error(err.message || "Failed to update bank account."),
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
      <PageHeader
        title="Banking & currencies"
        subtitle="Where we send settled funds by currency."
      />

      <Card className="w-full max-w-sm gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon name="landmark" size={18} />
          </span>
          {/* BACKEND GAP: settlement endpoint carries no primary/multi-account
              flag, so this label is not backed by real data yet. */}
          <Badge variant="default" size="sm">
            Primary
          </Badge>
        </div>

        <div>
          <p className="text-sm font-bold text-foreground">{bankName}</p>

          {editing ? (
            <form
              className="mt-3 space-y-3"
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
                  <Field>
                    <FieldLabel htmlFor="account-number">Account number</FieldLabel>
                    <Input
                      id="account-number"
                      inputMode="numeric"
                      placeholder="Enter new account number"
                      value={field.state.value}
                      aria-invalid={field.state.meta.errors.length > 0}
                      onChange={(e) => field.handleChange(e.target.value.replace(/\D/g, ""))}
                      onBlur={field.handleBlur}
                      className="font-mono tabular-nums"
                    />
                    <FieldError>{field.state.meta.errors[0]}</FieldError>
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
                  <Field>
                    <FieldLabel htmlFor="ifsc-code">IFSC code</FieldLabel>
                    <Input
                      id="ifsc-code"
                      placeholder="e.g. HDFC0000123"
                      value={field.state.value}
                      aria-invalid={field.state.meta.errors.length > 0}
                      onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
                      onBlur={field.handleBlur}
                      className="font-mono"
                    />
                    <FieldError>{field.state.meta.errors[0]}</FieldError>
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
              {/* Account number, masked by default with an eye toggle to reveal —
                  the real /settlement vs /settlement-details switch. */}
              <div className="mt-1 flex items-center gap-2">
                {isLoading ? (
                  <Shimmer className="h-4 w-32" />
                ) : (
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {accountNumber}
                  </span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={masked ? "Reveal account number" : "Hide account number"}
                  onClick={() => setMasked((prev) => !prev)}
                >
                  <Icon name={masked ? "eye" : "eye-off"} className="h-3.5 w-3.5" />
                </Button>
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                IFSC: <span className="font-mono tabular-nums">{ifscCode}</span>
              </p>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
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
