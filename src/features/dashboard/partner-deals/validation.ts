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

/** A card fee's brand: chosen, and not already priced by an earlier row
 *  (two prices for one brand would leave which applies undefined). */
export function cardBrandError(value: string, earlierBrands: string[]) {
  if (!value) return "Choose a brand.";
  if (earlierBrands.includes(value)) return "This brand already has a fee.";
  return undefined;
}

/** One rule that currently fails, with where it lives on the page. */
export interface DealIssue {
  /** The summary line it rolls up into, e.g. "International payment pricing". */
  group: string;
  /** The specific field, e.g. "Diners fee". */
  label: string;
  /** DOM id of the control to focus. */
  fieldId: string;
}

/** Field ids, shared with the inputs so a jump always lands on the right one. */
export const DEAL_FIELD_IDS = {
  referralType: "deal-referral-type",
  dealLabel: "deal-label",
  globalFee: "global-fee",
  internationalFee: (index: number) => `intl-fee-${index}`,
  platformFee: "domestic-platform-fee",
  cardBrand: (rowId: string) => `${rowId}-brand`,
  cardFee: (rowId: string) => `${rowId}-fee`,
} as const;

/**
 * Every rule the form enforces, run over the whole value set at once, as a
 * list in page order: the summary's count, its "what needs attention" list
 * and the jump to the first problem on Create all read this one function, so
 * none of them can disagree with the fields' own validators.
 */
export function listIssues(values: CreateDealValues): DealIssue[] {
  const ids = DEAL_FIELD_IDS;
  const checks: (DealIssue | null)[] = [
    referralTypeError(values.referralType)
      ? { group: "Referral type", label: "Referral type", fieldId: ids.referralType }
      : null,
    dealLabelError(values.dealLabel)
      ? { group: "Deal label", label: "Deal label", fieldId: ids.dealLabel }
      : null,
    feeError(values.global.fee, values.global.feeType)
      ? { group: "Global Accounts pricing", label: "Global Accounts fee", fieldId: ids.globalFee }
      : null,
    ...values.international.map((row, i) =>
      feeError(row.fee, row.feeType)
        ? {
            group: "International payment pricing",
            label: `${row.brand} fee`,
            fieldId: ids.internationalFee(i),
          }
        : null
    ),
    feeError(values.domestic.platform.fee, values.domestic.platform.feeType)
      ? { group: "Platform Fee pricing", label: "Platform fee", fieldId: ids.platformFee }
      : null,
    ...(values.domestic.customiseCards
      ? values.domestic.cards.flatMap((row, i, cards) => [
          cardBrandError(
            row.brand,
            cards.slice(0, i).map((c) => c.brand)
          )
            ? {
                group: "Card fees",
                label: `Card fee ${i + 1}: brand`,
                fieldId: ids.cardBrand(row.rowId),
              }
            : null,
          feeError(row.fee, row.feeType)
            ? {
                group: "Card fees",
                label: `Card fee ${i + 1}: fee`,
                fieldId: ids.cardFee(row.rowId),
              }
            : null,
        ])
      : []),
  ];
  return checks.filter((c): c is DealIssue => c !== null);
}

export function countIssues(values: CreateDealValues) {
  return listIssues(values).length;
}
