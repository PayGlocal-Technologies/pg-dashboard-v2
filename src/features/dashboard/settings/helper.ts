import { isValidEmail } from "@/validators";
import type { ChangeEmailFailure } from "@/features/dashboard/settings/types";

// ── Email validation ─────────────────────────────────────────────────────────

/** Client-side gate for the "new email" step of the change-email flow. Returns
 *  the message to show, or null when the address is worth submitting.
 *
 *  The malformed-address copy matches what the API returns for the same case,
 *  so the merchant sees one wording whichever side catches it. */
export function validateNewEmail(value: string, currentEmail?: string | null): string | null {
  const email = value.trim();
  if (!email) return "Please enter your new email address.";
  if (!isValidEmail(email)) return "Please provide a valid email id";

  const current = currentEmail?.trim();
  if (current && current.toLowerCase() === email.toLowerCase()) {
    return "This is already your email address.";
  }
  return null;
}

/** Reads a change-email rejection into something the dialog can branch on.
 *
 *  handleApiError rejects with the server envelope (its fields plus a
 *  normalised `message`), not an AxiosError — so the HTTP status survives only
 *  when the response body carried one, and callers must cope with it missing. */
export function parseChangeEmailFailure(error: unknown): ChangeEmailFailure {
  const fallback = "Something went wrong. Please try again.";
  if (!error || typeof error !== "object") return { message: fallback };

  const envelope = error as { message?: unknown; status?: unknown };
  const message =
    typeof envelope.message === "string" && envelope.message.trim() ? envelope.message : fallback;

  // Envelope `status` is a string like "401". Only error codes are useful here;
  // anything else (a success code, a missing field, a network failure) leaves
  // the status off and the caller falls back to showing the message alone.
  const status = Number(envelope.status);
  return Number.isInteger(status) && status >= 400 ? { message, status } : { message };
}
