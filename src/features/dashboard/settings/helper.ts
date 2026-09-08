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
 *  normalised `message`), not an AxiosError — so the HTTP status is only
 *  recoverable from the envelope's own `status` field, which the server prints
 *  as Java HttpStatus text ("401 UNAUTHORIZED"). parseInt takes the leading
 *  code and tolerates a bare "401" too; a body without one (a network failure,
 *  a non-envelope error) leaves the status off and the caller falls back to
 *  showing the message alone.
 *
 *  What the codes mean here: 403 is "not logged in at all", 400 is a rejected
 *  input, and 401 is either a wrong code or a step called out of order —
 *  telling those two apart is the caller's job, since only it knows which
 *  endpoint was being called. */
export function parseChangeEmailFailure(error: unknown): ChangeEmailFailure {
  const fallback = "Something went wrong. Please try again.";
  if (!error || typeof error !== "object") return { message: fallback };

  const envelope = error as { message?: unknown; status?: unknown };
  const message =
    typeof envelope.message === "string" && envelope.message.trim() ? envelope.message : fallback;

  const status =
    typeof envelope.status === "string" || typeof envelope.status === "number"
      ? parseInt(String(envelope.status), 10)
      : NaN;
  return Number.isInteger(status) && status >= 400 ? { message, status } : { message };
}
