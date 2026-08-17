import { COUNTRIES } from "@/components/ui";
import { CLIENT_BUSINESS_TYPES } from "@/features/dashboard/client-management/constants";
import type { Client, ClientFormValues } from "@/features/dashboard/client-management/types";

/**
 * Field validators for the Add client form. Plain functions rather than one
 * schema object, matching the Add item form's own arrangement (see
 * sku-management/schemas.ts): TanStack Form drives validation per field, so
 * per-field functions map onto it directly and can be reused verbatim by the
 * form-wide check below.
 *
 * The messages are the ones the spec names, so they live here rather than
 * inline at each call site.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateBusinessName(value: string): string | undefined {
  return value.trim() ? undefined : "Enter a business name";
}

export function validateBusinessType(value: string): string | undefined {
  return (CLIENT_BUSINESS_TYPES as readonly string[]).includes(value)
    ? undefined
    : "Select a business type";
}

/**
 * Optional, but a typed value still has to look like a URL. Deliberately
 * lenient about the scheme — a merchant typing "acme.com" means their website,
 * and rejecting it would be pedantry; `toClientFields` normalises it.
 */
export function validateWebsite(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return /^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/i.test(trimmed) ? undefined : "Enter a valid website";
}

export function validateContactName(value: string): string | undefined {
  return value.trim() ? undefined : "Enter a contact name";
}

export function validateContactEmail(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Enter an email address";
  return EMAIL_RE.test(trimmed) ? undefined : "Enter a valid email address";
}

/**
 * The dial code and the number are one field to the person filling the form,
 * so both halves report through this single message rather than the country
 * picker growing an error of its own beneath it.
 */
export function validatePhone(countryIso2: string, number: string): string | undefined {
  const digits = number.replace(/\D/g, "");
  if (!countryIso2 || !digits) return "Enter a valid phone number";
  // Loose on purpose: national numbering plans run from 7 to 12 digits and
  // this form has no libphonenumber to check a real one against, so the rule
  // only rejects lengths no country uses.
  return digits.length >= 6 && digits.length <= 14 ? undefined : "Enter a valid phone number";
}

export function validateCountry(value: string): string | undefined {
  return COUNTRIES.some((c) => c.code === value) ? undefined : "Select a country";
}

export function validateState(value: string): string | undefined {
  return value.trim() ? undefined : "Enter a state";
}

export function validateAddress(value: string): string | undefined {
  return value.trim() ? undefined : "Enter a street address";
}

export function validateCity(value: string): string | undefined {
  return value.trim() ? undefined : "Enter a city";
}

export function validateZipcode(value: string): string | undefined {
  return value.trim() ? undefined : "Enter a zipcode";
}

/**
 * Whether every required field currently holds a valid value. Gates submission,
 * so a client can never be created from a form that hasn't passed the same
 * rules the individual fields enforce.
 */
export function isClientFormValid(values: ClientFormValues): boolean {
  return (
    !validateBusinessName(values.businessName) &&
    !validateBusinessType(values.businessType) &&
    !validateWebsite(values.website) &&
    !validateContactName(values.primaryContactName) &&
    !validateContactEmail(values.primaryContactEmail) &&
    !validatePhone(values.phoneCountry, values.phoneNumber) &&
    !validateCountry(values.country) &&
    !validateState(values.state) &&
    !validateAddress(values.addressLine) &&
    !validateCity(values.city) &&
    !validateZipcode(values.zipcode)
  );
}

/** The dial code for a country, e.g. "GB" → "+44". */
export function dialCodeFor(countryIso2: string): string {
  return COUNTRIES.find((c) => c.code === countryIso2)?.dialCode ?? "";
}

/** The display name for a country, e.g. "GB" → "United Kingdom". */
export function countryNameFor(countryIso2: string): string {
  return COUNTRIES.find((c) => c.code === countryIso2)?.name ?? countryIso2;
}

/**
 * Turns validated form values into the client-record shape, minus the fields
 * the caller owns (`id`, and the invoice/outstanding figures a brand-new
 * client has none of). Returns null when the form doesn't pass, so a caller
 * can't build a half-valid client.
 *
 * `createdAt` is stamped here from the clock rather than being a form field —
 * it's generated, never entered. Safe because this only ever runs inside a
 * submit handler; the same call during render would break React's idempotency
 * guarantee (see CLAUDE.md).
 */
export function toClientFields(
  values: ClientFormValues
): Omit<
  Client,
  "id" | "outstandingAmount" | "outstandingCurrency" | "totalInvoices" | "paidInvoices"
> | null {
  if (!isClientFormValid(values)) return null;

  const countryName = countryNameFor(values.country);
  const addressLine = values.addressLine.trim();
  const city = values.city.trim();
  const state = values.state.trim();
  const zipcode = values.zipcode.trim();
  const website = values.website.trim();

  return {
    businessName: values.businessName.trim(),
    primaryContactName: values.primaryContactName.trim(),
    email: values.primaryContactEmail.trim(),
    phoneDialCode: dialCodeFor(values.phoneCountry),
    phoneNumber: values.phoneNumber.replace(/\D/g, ""),
    // Composed once, here, from the parts the form collected: the Contact
    // section renders this one string, while the parts stay on the record for
    // a future edit form to read back.
    billingAddress: [addressLine, city, state, zipcode, countryName].filter(Boolean).join(", "),
    countryIso2: values.country,
    countryName,
    createdAt: new Date().toISOString(),
    businessType: values.businessType,
    // Normalised so a bare "acme.com" is still a working link wherever this is
    // eventually rendered as one.
    website: website ? (/^https?:\/\//i.test(website) ? website : `https://${website}`) : undefined,
    tags: values.tags.length ? values.tags : undefined,
    addressLine,
    city,
    state,
    zipcode,
    gstin: values.gstin.trim() || undefined,
    notes: values.notes.trim() || undefined,
    contract: values.contract ?? undefined,
  };
}

/** A blank form — also what "Save and add another" resets back to. */
export function emptyClientForm(): ClientFormValues {
  return {
    businessName: "",
    businessType: "",
    website: "",
    tags: [],
    primaryContactName: "",
    primaryContactEmail: "",
    phoneCountry: "",
    phoneNumber: "",
    country: "",
    state: "",
    addressLine: "",
    city: "",
    zipcode: "",
    gstin: "",
    notes: "",
    contract: null,
  };
}

/** Whether anything has been typed — drives the unsaved-changes confirmation
 *  on Cancel, so an untouched form closes without a prompt. */
export function isClientFormDirty(values: ClientFormValues): boolean {
  const empty = emptyClientForm();
  return (Object.keys(empty) as (keyof ClientFormValues)[]).some((key) => {
    const value = values[key];
    if (Array.isArray(value)) return value.length > 0;
    if (value === null) return false;
    return typeof value === "string" ? value.trim() !== "" : value !== empty[key];
  });
}
