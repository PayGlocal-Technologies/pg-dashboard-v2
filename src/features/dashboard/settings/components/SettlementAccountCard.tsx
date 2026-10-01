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
  Separator,
  Shimmer,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { useSettlementDetails, useUpdateAccountDetails } from "@/features/dashboard/settings/hooks";
import {
  SETTLEMENT_CHANGE_INTERVAL_DAYS,
  SETTLEMENT_SUPPORT_EMAIL,
  formatDayCount,
  settlementChangePolicy,
} from "@/features/dashboard/settings/settlementChangePolicy";

// Indian IFSC: 4 letters, a 0, then 6 alphanumerics. The API also does its own
// IFSC lookup and 4xxs with "Invalid IFSC code" — this is just the client gate.
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_RE = /^\d{9,18}$/;

// This card is compact: size="sm" buttons (h-9, text-xs) and text-xs values.
// Flux's Input defaults to h-11/text-[15px] and FieldLabel to text-sm, which
// made the card jump a type scale the moment Edit was clicked. These scale the
// edit form to the card's own density instead.
const COMPACT_FIELD = "gap-1.5";
const COMPACT_LABEL = "text-xs font-medium text-muted-foreground";
const COMPACT_INPUT = "h-9 min-h-9 px-3 text-xs placeholder:font-sans";
const COMPACT_ERROR = "text-xs";

/**
 * The merchant's settlement account: header, the account number (masked,
 * with the eye toggle) and IFSC, an Edit text action, and the 30-day change
 * rule explained up front in its own quiet panel.
 *
 * Two states, both derived from `lastChangedDate` and today by
 * settlementChangePolicy, never stored twice:
 *  - Editable: Edit opens the inline edit form (the real update call).
 *  - Recently changed: Edit stays visible but inert, a tooltip says how many
 *    days are left, and the panel adds the countdown and the support email.
 */
export function SettlementAccountCard({
  lastChangedDate,
  isPolicyLoading = false,
}: {
  lastChangedDate: string | null;
  /** True until lastUpdatedTime has loaded. Edit stays inert meanwhile, so it
   *  can't be opened in the moment before a lock is known to apply. */
  isPolicyLoading?: boolean;
}) {
  // Eye toggle, exactly as pg-dashboard's SettlementDetails: masked reads the
  // /settlement endpoint, unmasked swaps to /settlement-details. Starts masked.
  const [masked, setMasked] = useState(true);
  const { settlement, isLoading } = useSettlementDetails(masked);

  const [editing, setEditing] = useState(false);
  const { updateAccount, isSaving, canEdit } = useUpdateAccountDetails();

  // Read once on mount (a lazy initializer, not during render).
  const [todayKey] = useState(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });
  const policy = settlementChangePolicy(lastChangedDate, todayKey);
  const locked = !isPolicyLoading && !policy.isEditable;
  const remaining = formatDayCount(policy.daysUntilEditable);
  // Something beyond the rule itself to say: the countdown while locked, or
  // that a lock has just run out.
  const hasMore = !isPolicyLoading && (locked || policy.windowJustEnded);
  const [policyOpen, setPolicyOpen] = useState(false);

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
    if (locked) return;
    // Account number is never prefilled — the read is masked and the full value
    // should be re-entered deliberately. IFSC is safe to prefill.
    form.reset({ number: "", ifscCode: ifscCode !== "—" ? ifscCode : "" });
    setEditing(true);
  };

  return (
    <Card className="w-full max-w-md gap-0 rounded-2xl p-5">
      {/* 1. Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon name="landmark" size={17} />
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

      {editing ? (
        <form
          className="mt-4 space-y-2.5"
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
                IFSC_RE.test(value.trim().toUpperCase()) ? undefined : "Enter a valid IFSC code",
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
          {/* 2. Account details: an open two-column pair (stacked on phones),
              label above value as elsewhere in Settings. */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Account number</p>
              <div className="mt-1 flex items-center gap-1">
                {isLoading ? (
                  <Shimmer className="h-5 w-28" />
                ) : (
                  <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                    {accountNumber}
                  </span>
                )}
                {/* The real /settlement vs /settlement-details switch. */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={masked ? "Reveal account number" : "Hide account number"}
                  className="h-6 min-h-0 w-6 shrink-0 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setMasked((prev) => !prev)}
                >
                  <Icon name={masked ? "eye" : "eye-off"} className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">IFSC code</p>
              <p className="mt-1 font-mono text-sm font-semibold text-foreground">{ifscCode}</p>
            </div>
          </div>

          {/* 3. Edit: a text action. Locked, it stays visible (so editing is
              clearly a thing) but inert, and says why on hover or focus.
              aria-disabled rather than disabled so it can still take focus
              and the tooltip can still open. */}
          <div className="mt-3">
            {locked ? (
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    aria-disabled
                    onClick={(e) => e.preventDefault()}
                    leftIcon={<Icon name="pencil" size={13} aria-hidden />}
                    className="h-auto min-h-0 cursor-not-allowed gap-1.5 p-0 text-[13px] font-medium text-muted-foreground hover:bg-transparent hover:text-muted-foreground hover:no-underline"
                  >
                    Edit
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-60">
                  You can change your settlement account again in {remaining}.
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={startEditing}
                disabled={!canEdit || isPolicyLoading}
                leftIcon={<Icon name="pencil" size={13} aria-hidden />}
                className="h-auto min-h-0 gap-1.5 p-0 text-[13px] font-medium"
              >
                Edit
              </Button>
            )}
          </div>
        </>
      )}

      <Separator className="my-4" />

      {/* 4. The 30-day rule, said before anyone hits it. Informational, not a
          warning: neutral fill, no colour, small icon. Only the rule itself
          shows by default; anything more (the countdown and support email
          while locked, or "can now be changed" once a lock has ended) sits
          behind a small "Read more", so the panel stays one quiet line. */}
      <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-3.5 py-3">
        <Icon
          name="clock"
          size={14}
          className="mt-0.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <div className="min-w-0 text-xs leading-relaxed text-muted-foreground">
          <p className="text-foreground">
            Settlement account details can be changed once every {SETTLEMENT_CHANGE_INTERVAL_DAYS}{" "}
            days.
          </p>
          {hasMore && (
            <>
              {policyOpen && (
                <div
                  id="settlement-policy-more"
                  className="mt-1 space-y-1 animate-in fade-in duration-150"
                >
                  {locked ? (
                    <>
                      <p>
                        You can change your details again in{" "}
                        <span className="font-semibold whitespace-nowrap text-foreground">
                          {remaining}
                        </span>
                        .
                      </p>
                      <p className="break-words">
                        Need additional help?{" "}
                        <a
                          href={`mailto:${SETTLEMENT_SUPPORT_EMAIL}`}
                          className="font-medium text-primary underline-offset-2 hover:underline"
                        >
                          {SETTLEMENT_SUPPORT_EMAIL}
                        </a>
                      </p>
                    </>
                  ) : (
                    <p>Settlement account details can now be changed.</p>
                  )}
                </div>
              )}
              <Button
                type="button"
                variant="link"
                size="sm"
                aria-expanded={policyOpen}
                aria-controls="settlement-policy-more"
                onClick={() => setPolicyOpen((o) => !o)}
                className="mt-1 h-auto min-h-0 p-0 !text-[11px] font-medium"
              >
                {policyOpen ? "Show less" : "Read more"}
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
