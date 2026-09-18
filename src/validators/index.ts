// Shared input validators. Import from "@/validators", not the files directly,
// so a validator can be split or renamed without touching its callers.
//
// What belongs here: format checks that more than one feature needs and that
// carry no feature-specific copy (email, and whatever joins it — IFSC, GSTIN,
// PAN shape). Messages stay with the feature, so the same check can be worded
// for its own screen.

export { isValidEmail } from "@/validators/email";
