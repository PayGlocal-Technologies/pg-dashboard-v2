import { create } from "zustand";
import type { MockAccount } from "@/features/auth/login/mockAccounts";

/** Sign-up screens, then the sign-in ones. "linked" is a conditional screen
 *  after sign-up's OTP, shown only when the number already has accounts. */
export type SignUpView = "account" | "verify" | "linked";
export type SignInView = "signIn" | "signInChoose" | "signInPassword" | "signInOtp" | "signInRole";
export type AuthView = SignUpView | SignInView;

export function isSignInView(view: AuthView): view is SignInView {
  return view.startsWith("signIn");
}

/** A number sign-up has already verified, carried into sign-in. */
export interface SignInPrefill {
  phoneCode: string;
  phone: string;
  /** The account picked on sign-up's linked-accounts screen: sign-in then
   *  opens straight on its password step. */
  account?: MockAccount;
}

interface AuthViewState {
  view: AuthView;
  signInPrefill: SignInPrefill | null;
  setView: (view: AuthView) => void;
  /** Switch to sign-in with the number filled in, or, when `account` is
   *  given, straight to that account's password step. */
  signInWithPhone: (prefill: SignInPrefill) => void;
}

/**
 * Which screen the (mock) unified auth card is showing.
 *
 * Shared because two parts of the auth layout react to it: the form, and the
 * brand panel on the left, which swaps its illustration and caption for
 * sign-in. The landing page also sets it before navigating, so "Login" opens
 * on sign-in and "Get started" on sign-up.
 *
 * Not persisted: a fresh visit to /login starts on sign-up.
 */
export const useAuthView = create<AuthViewState>((set) => ({
  view: "account",
  signInPrefill: null,
  // Any other navigation drops the prefill, so a later visit to sign-in
  // starts clean.
  setView: (view) => set({ view, signInPrefill: null }),
  signInWithPhone: (signInPrefill) =>
    set({ view: signInPrefill.account ? "signInPassword" : "signIn", signInPrefill }),
}));
