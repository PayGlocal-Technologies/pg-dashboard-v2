import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

/**
 * Cross-screen state for the forgot-password machine (identifier → OTP →
 * reset). Mirrors pg-dashboard's useForgotPassword. Only the resend timestamp
 * is persisted.
 */
interface ForgotPasswordState {
  identifier: string;
  maskedEmail: string;
  maskedPhoneNumber: string;
  otpInitiateTimestamp: number;

  setIdentifier: (identifier: string) => void;
  setMaskedEmail: (maskedEmail: string) => void;
  setMaskedPhoneNumber: (maskedPhoneNumber: string) => void;
  setOtpInitiateTimestamp: (ts: number) => void;
  reset: () => void;
}

const initial = {
  identifier: "",
  maskedEmail: "",
  maskedPhoneNumber: "",
  otpInitiateTimestamp: 0,
};

export const useForgotPassword = create<ForgotPasswordState>()(
  devtools(
    persist(
      (set) => ({
        ...initial,
        setIdentifier: (identifier) => set({ identifier }, false, "setIdentifier"),
        setMaskedEmail: (maskedEmail) => set({ maskedEmail }, false, "setMaskedEmail"),
        setMaskedPhoneNumber: (maskedPhoneNumber) =>
          set({ maskedPhoneNumber }, false, "setMaskedPhoneNumber"),
        setOtpInitiateTimestamp: (otpInitiateTimestamp) =>
          set({ otpInitiateTimestamp }, false, "setOtpInitiateTimestamp"),
        reset: () => set(initial, false, "reset"),
      }),
      {
        name: "forgotPasswordState",
        partialize: (state) => ({ otpInitiateTimestamp: state.otpInitiateTimestamp }),
      }
    ),
    { name: "forgot-password-store" }
  )
);
