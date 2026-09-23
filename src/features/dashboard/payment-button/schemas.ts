/**
 * Field validators for the create form. Plain functions rather than one schema
 * object, the arrangement client-management and sku-management use: TanStack
 * Form validates per field, so per-field functions map onto it directly.
 */

export function validateButtonLabel(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Enter a button label";
  return trimmed.length <= 30 ? undefined : "Keep the label to 30 characters or fewer";
}

/** Only a fixed-amount button has an amount to check. */
export function validateButtonAmount(amount: string, isFixed: boolean): string | undefined {
  if (!isFixed) return undefined;
  const value = parseFloat(amount);
  return Number.isFinite(value) && value > 0 ? undefined : "Enter an amount greater than 0";
}

export function validateCustomFieldLabel(value: string): string | undefined {
  return value.trim() ? undefined : "Enter a label for this field";
}

export function validateCustomFieldDefault(value: string): string | undefined {
  return value.trim() ? undefined : "Enter a default value, or untick the box";
}
