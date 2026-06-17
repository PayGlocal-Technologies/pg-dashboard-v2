"use client";

import { useState } from "react";
import { IdentifierForm } from "@/features/auth/login/components/IdentifierForm";
import { PasswordForm } from "@/features/auth/login/components/PasswordForm";
import { OtpForm } from "@/features/auth/login/components/OtpForm";
import { TwoFAOtpForm } from "@/features/auth/login/components/TwoFAOtpForm";
import { ChangePasswordForm } from "@/features/auth/login/components/ChangePasswordForm";
import { UsernameForm } from "@/features/auth/login/components/UsernameForm";
import { PhoneNumberForm, NamePhoneNumberForm } from "@/features/auth/login/components/PhoneNumberForm";
import { CountryQuestionnaireForm } from "@/features/auth/login/components/CountryQuestionnaireForm";
import type { LoginScreen, LoginScreenProps } from "@/features/auth/login/types";

const FORM_MAPPING: Record<LoginScreen, React.ComponentType<LoginScreenProps>> = {
  identifier: IdentifierForm,
  password: PasswordForm,
  otp: OtpForm,
  twoFA: TwoFAOtpForm,
  changePassword: ChangePasswordForm,
  username: UsernameForm,
  phoneNumber: PhoneNumberForm,
  namePhoneNumber: NamePhoneNumberForm,
  countryQuestionnaire: CountryQuestionnaireForm,
};

export function LoginFeature() {
  const [screen, setScreen] = useState<LoginScreen>("identifier");
  const ActiveForm = FORM_MAPPING[screen];
  return <ActiveForm setScreen={setScreen} />;
}
