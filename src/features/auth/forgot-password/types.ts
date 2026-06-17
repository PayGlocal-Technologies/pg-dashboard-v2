/** Screens in the forgot-password state machine. */
export type ForgotPasswordScreen = "identifier" | "username" | "resetOtp" | "resetPassword";

export interface ForgotPasswordScreenProps {
  setScreen: (screen: ForgotPasswordScreen) => void;
}
