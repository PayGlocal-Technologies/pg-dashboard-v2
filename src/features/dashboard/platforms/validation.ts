/**
 * Field rules the two statement drawers share, mirrored from the validators
 * pg-dashboard attaches to the same fields (`emailValidator`,
 * `sellerAddressValidator`, `specialCharAllowedValidator`).
 *
 * Kept identical to production deliberately: the backend, not the form, is what
 * rejects a name or address it can't render into a PDF, so a looser rule here
 * only moves the failure later.
 */

/** Same rule as pg-dashboard's `isValidEmail` (src/utils/index.ts). */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** The characters pg-dashboard's `sellerAddressValidator` permits. */
const ADDRESS_ALLOWED = /^[A-Za-z0-9_., +:'/&|#@-]*$/;

/** pg-dashboard's own wording for the rule above. */
export const ADDRESS_ERROR = "Only { : , . / & - _ ' | # @ } special characters allowed";

/** "" when the address is acceptable, so callers can use it as both the
 *  validity test and the message. Empty input is valid here — a required field
 *  is a separate concern, exactly as in pg-dashboard. */
export function addressError(address: string): string {
  return ADDRESS_ALLOWED.test(address) ? "" : ADDRESS_ERROR;
}

/**
 * The characters pg-dashboard's `specialCharAllowedValidator` permits — the
 * rule it puts on a merchant name field. Narrower than the address rule above:
 * no `#` or `@`.
 *
 * `'-/` is a range, exactly as in production, so it also admits ( ) * , - . —
 * kept verbatim rather than spelled out, so the two rules can be diffed
 * character for character.
 */
const NAME_ALLOWED = /^[A-Za-z0-9_., +:'-/&|]*$/;

/** pg-dashboard's own wording for the rule above. */
export const NAME_ERROR = "Only { : , . / & - _ ' | } special characters allowed";

/** "" when the name is acceptable. Empty input is valid here — required is a
 *  separate concern, as in pg-dashboard. */
export function nameError(name: string): string {
  return NAME_ALLOWED.test(name) ? "" : NAME_ERROR;
}
