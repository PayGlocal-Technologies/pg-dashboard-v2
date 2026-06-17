export type LoginScreen =
  | "identifier"
  | "password"
  | "otp"
  | "twoFA"
  | "changePassword"
  | "username"
  | "phoneNumber"
  | "namePhoneNumber"
  | "countryQuestionnaire";

export interface LoginScreenProps {
  setScreen: (screen: LoginScreen) => void;
}
