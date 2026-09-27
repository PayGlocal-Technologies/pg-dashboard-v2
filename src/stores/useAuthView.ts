import { create } from "zustand";

/** Sign-up steps, then the sign-in steps. "linked" is a conditional screen
 *  inside sign-up's step 2, not a step of its own. */
export type SignUpView = "account" | "verify" | "linked" | "about";
export type SignInView = "signIn" | "signInChoose" | "signInPassword" | "signInOtp";
export type AuthView = SignUpView | SignInView;

export function isSignInView(view: AuthView): view is SignInView {
  return view.startsWith("signIn");
}

/** A number sign-up has already verified, carried into sign-in. */
export interface SignInPrefill {
  phoneCode: string;
  phone: string;
}

interface AuthViewState {
  view: AuthView;
  signInPrefill: SignInPrefill | null;
  setView: (view: AuthView) => void;
  /** Switch to sign-in with the phone tab selected and the number filled in. */
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
  signInWithPhone: (signInPrefill) => set({ view: "signIn", signInPrefill }),
}));
