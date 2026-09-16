// One email check for the whole app.
//
// Lives here because features kept declaring their own copies of the same regex
// — login's schemas, client-management's schemas, the multi-currency share
// modal, the add-team-member modal and the transaction request builder each had
// one — and copies drift. Tighten one and the others silently disagree about
// what a valid address is. Those five still hold their own copies; point them
// here as you touch them (buildTxnRequestBody notes why it is the one
// exception).
//
// Deliberately loose: one @, no whitespace, a dot-something domain. That is
// what every existing copy in this app accepted, and anything stricter starts
// rejecting addresses that are legal and deliverable. Servers validate their
// own inputs regardless; this only saves a round trip and gives the merchant a
// faster answer.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** True when `value` looks like an email address. Trims first, so a pasted
 *  address with trailing whitespace passes. */
export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}
