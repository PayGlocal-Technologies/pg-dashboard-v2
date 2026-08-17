import { SKU_CURRENCIES } from "@/features/dashboard/sku-management/constants";
import type {
  SkuCurrency,
  SkuItemFormValues,
  SkuProductType,
} from "@/features/dashboard/sku-management/types";

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

export function validateCurrency(value: string): string | undefined {
  return (SKU_CURRENCIES as readonly string[]).includes(value) ? undefined : "Select a currency";
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

/**
 * Turns validated form values into the catalogue row shape. Returns null when
 * the form doesn't pass, so a caller can't accidentally build a half-valid
 * product — the null check is what narrows the form's string-typed enums to
 * SkuProductType/SkuCurrency.
 */
export function toSkuProductFields(values: SkuItemFormValues): {
  name: string;
  type: SkuProductType;
  hsnSac: string;
  currency: SkuCurrency;
  sellingPrice: number;
  productCost: number;
  description: string;
  images?: string[];
} | null {
  if (!isSkuItemFormValid(values)) return null;

  const images = values.images.map((image) => image.url);

  return {
    name: values.name.trim(),
    type: values.type as SkuProductType,
    hsnSac: values.hsnSac.trim(),
    currency: values.currency as SkuCurrency,
    sellingPrice: Number(values.sellingPrice),
    // Blank cost is a real answer ("I haven't recorded one"), stored as 0
    // rather than left undefined so the column always has a figure to format.
    productCost: values.productCost.trim() ? Number(values.productCost) : 0,
    description: values.description.trim(),
    images: images.length ? images : undefined,
  };
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
