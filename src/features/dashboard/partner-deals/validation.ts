import { DEAL_LABEL_MAX } from "@/features/dashboard/partner-deals/constants";
import type { CreateDealValues, FeeType } from "@/features/dashboard/partner-deals/types";

/**
 * Create Deal rules. PLACEHOLDERS: pg-dashboard's own drawer rules weren't
 * available when this was built, so these are the minimum a pricing form
 * needs; replace with the real ones when porting. Each returns an error
 * message, or undefined when the value is fine. The field validators and the
 * summary's "Ready to create" line both use these, so the two never disagree.
 */

export function referralTypeError(value: string) {
  return value ? undefined : "Choose a referral type.";
}

export function dealLabelError(value: string) {
  const v = value.trim();
  if (!v) return "Enter a deal label.";
  if (v.length > DEAL_LABEL_MAX) return `Keep it to ${DEAL_LABEL_MAX} characters.`;
  return undefined;
}

export function feeError(value: string, type: FeeType) {
  const v = value.trim();
  if (!v) return "Enter a fee.";
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return "Use a number with up to 2 decimals.";
  if (type === "PERCENTAGE" && Number(v) > 100) return "Can't be more than 100%.";
  return undefined;
}

export function requiredChoiceError(value: string, what: string) {
  return value ? undefined : `Choose a ${what}.`;
}

/** Every rule the form enforces, run over the whole value set at once. */
export function countIssues(values: CreateDealValues) {
  const checks = [
    referralTypeError(values.referralType),
    dealLabelError(values.dealLabel),
    feeError(values.global.fee, values.global.feeType),
    ...values.international.map((row) => feeError(row.fee, row.feeType)),
    feeError(values.domestic.platform.fee, values.domestic.platform.feeType),
    ...(values.domestic.customiseCards
      ? values.domestic.cards.flatMap((row) => [
          requiredChoiceError(row.network, "network"),
          requiredChoiceError(row.cardType, "card type"),
          feeError(row.fee, row.feeType),
        ])
      : []),
  ];
  return checks.filter(Boolean).length;
}
