"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Field,
  FieldError,
  FieldLabel,
  Input,
  OtpInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { formatCurrency } from "@/lib/utils";

const REFUND_REASONS = [
  { value: "requested_by_customer", label: "Requested by customer" },
  { value: "duplicate", label: "Duplicate payment" },
  { value: "fraudulent", label: "Fraudulent" },
  { value: "other", label: "Other" },
];

/** Where the refund's one-time code is sent. */
const OTP_CHANNELS = [
  { value: "email", label: "Email", destination: "registered email address" },
  { value: "sms", label: "SMS", destination: "registered mobile number" },
] as const;
type OtpChannel = (typeof OTP_CHANNELS)[number]["value"];

/** The app's OTP length (see OTP_LENGTH in the login schemas). */
const REFUND_OTP_LENGTH = 4;
/** How long before the code can be sent again. */
const RESEND_SECONDS = 30;

type Step = "details" | "verify";

export interface RefundSubmission {
  amount: number;
  reason: string;
  details: string;
}

interface IssueRefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  refundableAmount: number;
  onSubmit: (input: RefundSubmission) => void;
}

/**
 * Two steps: the refund itself (amount, reason, where to receive the OTP,
 * details), then the OTP that authorises it. The refund is issued only once
 * the code is entered.
 *
 * MOCK: sending and checking the OTP are simulated (any complete code is
 * accepted). TODO(integration): call the refund OTP send/verify endpoints
 * once their contracts are confirmed against pg-dashboard; nothing about
 * them is assumed here.
 *
 * Issuing a refund here records a child RefundEvent against the original
 * transaction (see useRefundEvents), it never creates a second
 * merchant-facing transaction, the same TXN ID's own status updates to
 * Partially refunded/Refunded once this is submitted (see
 * deriveTransactionStatus/getDisplayStatus).
 */
export function IssueRefundDialog({
  open,
  onOpenChange,
  currency,
  refundableAmount,
  onSubmit,
}: IssueRefundDialogProps) {
  const [amountInput, setAmountInput] = useState(() => String(refundableAmount));
  const [reason, setReason] = useState(REFUND_REASONS[0]!.value);
  const [details, setDetails] = useState("");
  const [channel, setChannel] = useState<OtpChannel>("email");
  const [step, setStep] = useState<Step>("details");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Counts the resend wait down while the code step is showing; setState only
  // inside the interval callback (CLAUDE.md's hooks purity rules).
  useEffect(() => {
    if (step !== "verify" || resendIn <= 0) return;
    const id = window.setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [step, resendIn > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  function reset() {
    setAmountInput(String(refundableAmount));
    setReason(REFUND_REASONS[0]!.value);
    setDetails("");
    setChannel("email");
    setStep("details");
    setOtp("");
    setOtpError("");
    setResendIn(0);
  }

  function handleOpenChange(next: boolean) {
    // Resync the draft every time the dialog opens, not via an effect, see
    // CLAUDE.md's hooks purity rules.
    if (next) reset();
    onOpenChange(next);
  }

  const parsedAmount = Math.min(Math.max(parseFloat(amountInput) || 0, 0), refundableAmount);
  const destination = OTP_CHANNELS.find((c) => c.value === channel)!.destination;

  // MOCK: stands in for the send-OTP call.
  function sendOtp() {
    setOtp("");
    setOtpError("");
    setResendIn(RESEND_SECONDS);
    toast.success(`OTP sent to your ${destination}`);
  }

  function handleContinue() {
    if (parsedAmount <= 0) return;
    sendOtp();
    setStep("verify");
  }

  function handleRefund(code = otp) {
    if (code.length < REFUND_OTP_LENGTH) {
      setOtpError(`Enter the ${REFUND_OTP_LENGTH}-digit code.`);
      return;
    }
    // MOCK: stands in for the verify-OTP call; any complete code passes.
    onSubmit({ amount: parsedAmount, reason, details });
    onOpenChange(false);
  }

  const refundLabel = `Refund ${formatCurrency(parsedAmount, currency)}`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] max-w-sm flex-col gap-0 overflow-hidden p-0"
        onOpenAutoFocus={(e) => {
          // Radix focuses the first focusable descendant by default, which
          // would otherwise be the info icon button, opening its tooltip the
          // instant the dialog appears. Redirect focus to the amount input.
          e.preventDefault();
          amountInputRef.current?.focus();
        }}
      >
        {/* Header / scrolling body / fixed footer, so Cancel and Refund stay
         * on screen however tall the body runs. The header row sits inline
         * with the library's absolutely-positioned (top-3 right-3) close
         * button rather than below the default pt-10 reserved for it. */}
        <div className="flex shrink-0 items-center gap-1.5 border-b border-border px-6 py-4 pr-14">
          <DialogTitle className="pr-0">
            {step === "details" ? "Refund payment" : "Verify refund"}
          </DialogTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                aria-label="About refunds"
                className="h-5 w-5 min-h-0 min-w-0 shrink-0 rounded-full p-0 text-muted-foreground/70 hover:text-muted-foreground"
              >
                <Icon name="info" size={13} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-60 text-xs">
              Refunds can take 5 to 10 days to appear on the customer&apos;s statement. This
              transaction&apos;s status will update to reflect the refund, no new transaction is
              created for it.
            </TooltipContent>
          </Tooltip>
        </div>

        {step === "details" ? (
          <>
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
              <Field className="gap-2">
                <FieldLabel htmlFor="refund-amount">Refund amount</FieldLabel>
                <div className="flex items-center gap-2">
                  <Input
                    ref={amountInputRef}
                    id="refund-amount"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={refundableAmount}
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">{currency}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Up to {formatCurrency(refundableAmount, currency)} refundable.
                </p>
              </Field>

              <Field className="gap-2">
                <FieldLabel htmlFor="refund-reason">Reason</FieldLabel>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id="refund-reason">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REFUND_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field className="gap-2">
                <FieldLabel htmlFor="refund-otp-channel">Receive OTP via</FieldLabel>
                <Select value={channel} onValueChange={(v) => setChannel(v as OtpChannel)}>
                  <SelectTrigger id="refund-otp-channel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OTP_CHANNELS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field className="gap-2">
                <FieldLabel htmlFor="refund-details">Additional details (optional)</FieldLabel>
                <Textarea
                  id="refund-details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Add more details about this refund"
                  rows={3}
                  className="resize-none text-sm"
                />
              </Field>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleContinue}
                disabled={parsedAmount <= 0}
              >
                Send OTP
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
              <DialogDescription className="text-sm text-muted-foreground">
                Enter the {REFUND_OTP_LENGTH}-digit code sent to your {destination} to refund{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(parsedAmount, currency)}
                </span>
                .
              </DialogDescription>
              <Field className="gap-2">
                <FieldLabel>Verification code</FieldLabel>
                <OtpInput
                  value={otp}
                  onChange={(v) => {
                    setOtp(v);
                    if (otpError) setOtpError("");
                  }}
                  length={REFUND_OTP_LENGTH}
                  invalid={!!otpError}
                  autoFocus
                />
                <FieldError>{otpError}</FieldError>
              </Field>
              <p className="text-xs text-muted-foreground">
                Didn&apos;t get it?{" "}
                {resendIn > 0 ? (
                  <span>Resend in {resendIn}s</span>
                ) : (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto min-h-0 p-0 text-xs"
                    onClick={sendOtp}
                  >
                    Resend OTP
                  </Button>
                )}
              </p>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-6 py-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<Icon name="chevron-left" className="h-4 w-4" />}
                onClick={() => setStep("details")}
                className="pl-1 text-muted-foreground hover:text-foreground"
              >
                Back
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => handleRefund()}
                disabled={otp.length < REFUND_OTP_LENGTH}
              >
                {refundLabel}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
