import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { UserCreationType } from "@/features/auth/types";

interface LoginState {
  identifier: string;
  maskedEmail: string;
  maskedPhoneNumber: string;
  hasPassword: boolean;
  isPhoneNumberOtpLogin: boolean;
  userCreationType: UserCreationType;
  loginFlowCountryCode: string;
  /** ms timestamp the OTP was (re)sent — drives the resend countdown. */
  emailOtpInitiateTimestamp: number;
  smsOtpInitiateTimestamp: number;
  hasChangedPassword: boolean;
  /** True when the login UI is embedded in a website iframe; success/forgot events use postMessage. */
  isWebsiteLogin: boolean;

  setIdentifier: (identifier: string) => void;
  setMaskedEmail: (maskedEmail: string) => void;
  setMaskedPhoneNumber: (maskedPhoneNumber: string) => void;
  setHasPassword: (hasPassword: boolean) => void;
  setIsPhoneNumberOtpLogin: (isPhoneNumberOtpLogin: boolean) => void;
  setUserCreationType: (userCreationType: UserCreationType) => void;
  setLoginFlowCountryCode: (code: string) => void;
  setEmailOtpInitiateTimestamp: (ts: number) => void;
  setSmsOtpInitiateTimestamp: (ts: number) => void;
  setHasChangedPassword: (hasChangedPassword: boolean) => void;
  setIsWebsiteLogin: (isWebsiteLogin: boolean) => void;
  reset: () => void;
}

const initial = {
  identifier: "",
  maskedEmail: "",
  maskedPhoneNumber: "",
  hasPassword: false,
  isPhoneNumberOtpLogin: false,
  userCreationType: "OLD_FLOW" as UserCreationType,
  loginFlowCountryCode: "",
  emailOtpInitiateTimestamp: 0,
  smsOtpInitiateTimestamp: 0,
  hasChangedPassword: false,
  isWebsiteLogin: false,
};

export const useLogin = create<LoginState>()(
  devtools(
    persist(
      (set) => ({
        ...initial,
        setIdentifier: (identifier) => set({ identifier }, false, "setIdentifier"),
        setMaskedEmail: (maskedEmail) => set({ maskedEmail }, false, "setMaskedEmail"),
        setMaskedPhoneNumber: (maskedPhoneNumber) =>
          set({ maskedPhoneNumber }, false, "setMaskedPhoneNumber"),
        setHasPassword: (hasPassword) => set({ hasPassword }, false, "setHasPassword"),
        setIsPhoneNumberOtpLogin: (isPhoneNumberOtpLogin) =>
          set({ isPhoneNumberOtpLogin }, false, "setIsPhoneNumberOtpLogin"),
        setUserCreationType: (userCreationType) =>
          set({ userCreationType }, false, "setUserCreationType"),
        setLoginFlowCountryCode: (loginFlowCountryCode) =>
          set({ loginFlowCountryCode }, false, "setLoginFlowCountryCode"),
        setEmailOtpInitiateTimestamp: (emailOtpInitiateTimestamp) =>
          set({ emailOtpInitiateTimestamp }, false, "setEmailOtpInitiateTimestamp"),
        setSmsOtpInitiateTimestamp: (smsOtpInitiateTimestamp) =>
          set({ smsOtpInitiateTimestamp }, false, "setSmsOtpInitiateTimestamp"),
        setHasChangedPassword: (hasChangedPassword) =>
          set({ hasChangedPassword }, false, "setHasChangedPassword"),
        setIsWebsiteLogin: (isWebsiteLogin) =>
          set({ isWebsiteLogin }, false, "setIsWebsiteLogin"),
        reset: () => set(initial, false, "reset"),
      }),
      {
        name: "loginState",
        partialize: (state) => ({
          hasChangedPassword: state.hasChangedPassword,
          emailOtpInitiateTimestamp: state.emailOtpInitiateTimestamp,
        }),
      }
    ),
    { name: "login-store" }
  )
);
