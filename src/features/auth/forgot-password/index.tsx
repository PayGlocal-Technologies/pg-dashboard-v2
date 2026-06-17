"use client";

import { useState } from "react";
import { IdentifierForm } from "@/features/auth/forgot-password/components/IdentifierForm";
import { UsernameForm } from "@/features/auth/forgot-password/components/UsernameForm";
import { OtpForm } from "@/features/auth/forgot-password/components/OtpForm";
import { ResetPasswordForm } from "@/features/auth/forgot-password/components/ResetPasswordForm";
import type { ForgotPasswordScreen, ForgotPasswordScreenProps } from "@/features/auth/forgot-password/types";

const FORM_MAPPING: Record<
  ForgotPasswordScreen,
  React.ComponentType<ForgotPasswordScreenProps>
> = {
  identifier: IdentifierForm,
  username: UsernameForm,
  resetOtp: OtpForm,
  resetPassword: ResetPasswordForm,
};

/** Forgot-password screen machine: identifier → (username →) OTP → new password → /login. */
export function ForgotPasswordFeature() {
  const [screen, setScreen] = useState<ForgotPasswordScreen>("identifier");
  const ActiveForm = FORM_MAPPING[screen];
  return <ActiveForm setScreen={setScreen} />;
}
