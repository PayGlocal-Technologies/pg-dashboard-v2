import type { SkuItemFormValues } from "@/features/dashboard/sku-management/types";

/**
 * Field validators for the Add/Edit item form. Plain functions rather than a
 * single zod object schema: three of these fields depend on another field's
 * value (the tax code's necessity follows the chosen type, and both prices are
 * read against the chosen currency), and TanStack Form drives validation per
 * field, so per-field functions map onto it directly and can be reused
 * verbatim by the form-wide check below.
 *
 * The messages are the ones the spec names, so they're asserted here rather
 * than written inline at each call site.
 */

export function validateName(value: string): string | undefined {
  return value.trim() ? undefined : "Enter a product name";
}

export function validateType(value: string): string | undefined {
  return value === "GOODS" || value === "SERVICES" ? undefined : "Select a product type";
}

/**
 * Checks that a currency was chosen, not that it is one of a fixed seven: the
 * options are fetched per merchant (useMcaCurrencies), so the authoritative list
 * lives on the server and the select can only ever offer codes from it. Testing
 * membership of SKU_CURRENCIES here would reject a currency the merchant is
 * genuinely configured for.
 */
export function validateCurrency(value: string): string | undefined {
  return value.trim() ? undefined : "Select a currency";
}

/**
 * Required for both product types — goods file an HSN code and services a SAC
 * code, so there is no type for which the field is optional. It's validated
 * against the type anyway (rather than being unconditionally required) so the
 * message can't fire before the merchant has been told which scheme applies.
 */
export function validateHsnSac(value: string, type: string): string | undefined {
  if (type !== "GOODS" && type !== "SERVICES") return undefined;
  return value.trim() ? undefined : "Enter an HSN/SAC code";
}

/** Shared numeric rule: a price is a finite, non-negative number. */
function parseAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Number(), not parseFloat: parseFloat("12abc") is 12, which would accept
  // typed junk as a price.
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return amount;
}

export function validateSellingPrice(value: string): string | undefined {
  return parseAmount(value) === null ? "Enter a valid selling price" : undefined;
}

/** Optional — but if something has been typed, it still has to be a price. */
export function validateProductCost(value: string): string | undefined {
  if (!value.trim()) return undefined;
  return parseAmount(value) === null ? "Enter a valid product cost" : undefined;
}

/**
 * Whether every required field currently holds a valid value. Used to gate
 * submission, so an item can never be created from a form that hasn't passed
 * the same rules the individual fields enforce.
 */
export function isSkuItemFormValid(values: SkuItemFormValues): boolean {
  return (
    !validateName(values.name) &&
    !validateType(values.type) &&
    !validateHsnSac(values.hsnSac, values.type) &&
    !validateCurrency(values.currency) &&
    !validateSellingPrice(values.sellingPrice) &&
    !validateProductCost(values.productCost)
  );
}

/** A blank form — also what "Save and add another" resets back to. */
export function emptySkuItemForm(): SkuItemFormValues {
  return {
    name: "",
    type: "",
    hsnSac: "",
    currency: "",
    sellingPrice: "",
    productCost: "",
    description: "",
    images: [],
  };
}
