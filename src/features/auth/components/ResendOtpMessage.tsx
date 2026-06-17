"use client";

import { Button } from "@/components/ui";
import { useCountdown } from "@/features/auth/hooks";

const RESEND_WINDOW_SECONDS = 30;

interface ResendOtpMessageProps {
  /** ms timestamp the OTP was last sent. */
  startTime: number;
  message: string;
  onResend: () => void;
  disabled?: boolean;
}

/** "Didn't get it? Resend OTP in 0:30" — disables resend until the window elapses. */
export function ResendOtpMessage({
  startTime,
  message,
  onResend,
  disabled,
}: ResendOtpMessageProps) {
  const remaining = useCountdown(startTime, RESEND_WINDOW_SECONDS);
  const canResend = remaining <= 0 && !disabled;

  return (
    <p className="text-[13px] leading-relaxed text-muted-foreground">
      {message}{" "}
      <Button
        variant="link"
        type="button"
        disabled={!canResend}
        onClick={onResend}
        className="text-[13px]"
      >
        Resend OTP
      </Button>
      {remaining > 0 && <span> in 0:{String(remaining).padStart(2, "0")}</span>}
    </p>
  );
}
