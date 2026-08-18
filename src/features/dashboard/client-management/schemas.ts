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
    addressLine2: "",
    city: "",
    zipcode: "",
    // Both default to the case that needs no extra typing: one name, one
    // address. Either can be unticked to reveal the fields it collapses.
    sameAsBusinessName: false,
    sameAsBillingAddress: true,
    shippingAddressLine: "",
    shippingAddressLine2: "",
    shippingCity: "",
    shippingState: "",
    shippingZipcode: "",
    shippingCountry: "",
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
