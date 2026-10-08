import type { CreatePaymentLinkValues } from "@/features/dashboard/payment-links/create/types";

// Ported from pg-dashboard's src/features/create-mca-payment-invoice
// (constants.tsx and validationPatterns.ts), PAYMENT page only.

/** Names and product descriptions, per the backend contract. */
export const NAME_TEXT_PATTERN = /^[A-Za-z0-9_., +:'-]*$/;
export const NAME_TEXT_PATTERN_MESSAGE =
  "can only contain letters, numbers, spaces, and _ . , + : ' -";

/** Phone numbers and address lines, per the backend contract. */
export const EXTENDED_ALNUM_PATTERN = /^[a-zA-Z0-9!#$%&^*()_,\-.:;=?:~ ]*$/;
export const EXTENDED_ALNUM_PATTERN_MESSAGE =
  "can only contain letters, numbers, spaces, and ! # $ % & ^ * ( ) _ , - . : ; = ? ~";

/**
 * Full Name feeds both plCustomerData.fullName (backend allows 120) and the
 * billing/shipping firstName (backend caps at 60), so it is capped at 60.
 */
export const NAME_MAX_LENGTH = 60;
export const DESCRIPTION_MAX_LENGTH = 255;
export const EMAIL_MAX_LENGTH = 255;
export const PHONE_MAX_LENGTH = 20;
export const ADDRESS_LINE_MAX_LENGTH = 400;
export const CITY_MAX_LENGTH = 60;
export const ZIPCODE_MAX_LENGTH = 10;

/** The phone field's dial code until one is picked. */
export const DEFAULT_CALLING_CODE_ISO2 = "IN";
export const DEFAULT_CALLING_CODE = "+91";

/** Expiry choices, in hours, capped by the merchant's `maxPlExpiryHours`. */
export const EXPIRY_OPTIONS = [
  { label: "2 hours", value: 2 },
  { label: "4 hours", value: 4 },
  { label: "8 hours", value: 8 },
  { label: "16 hours", value: 16 },
  { label: "24 hours", value: 24 },
  { label: "2 days", value: 48 },
  { label: "3 days", value: 72 },
  { label: "4 days", value: 96 },
  { label: "5 days", value: 120 },
  { label: "6 days", value: 144 },
  { label: "7 days", value: 168 },
  { label: "8 days", value: 192 },
  { label: "9 days", value: 216 },
  { label: "10 days", value: 240 },
  { label: "15 days", value: 360 },
  { label: "20 days", value: 480 },
  { label: "25 days", value: 600 },
  { label: "30 days", value: 720 },
];
export const DEFAULT_EXPIRY_HOURS = 2;

export const FREQUENCY_OPTIONS = [
  { label: "Weekly", value: "weekly" },
  { label: "Bi-Weekly", value: "bi-weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Half Yearly", value: "half-yearly" },
  { label: "Yearly", value: "yearly" },
];

/** How far apart each instalment falls. */
export const FREQUENCY_STEP: Record<string, { num: number; unit: "day" | "month" }> = {
  weekly: { num: 7, unit: "day" },
  "bi-weekly": { num: 14, unit: "day" },
  monthly: { num: 1, unit: "month" },
  quarterly: { num: 3, unit: "month" },
  "half-yearly": { num: 6, unit: "month" },
  yearly: { num: 12, unit: "month" },
  "on-demand": { num: 1, unit: "month" },
};

export const FIRST_INSTALMENT_TYPE_OPTIONS = [
  { label: "Percentage", value: "percentage" },
  { label: "Absolute", value: "fixed" },
];

/** Bounds upstream puts on recurring payments. */
export const MIN_FIRST_INSTALMENT_PERCENT = 30;
export const MAX_FIRST_INSTALMENT_PERCENT = 99;
export const MIN_NUMBER_OF_PAYMENTS = 1;
export const MAX_NUMBER_OF_PAYMENTS = 10;

const EMPTY_ADDRESS = {
  streetAddress: "",
  landmark: "",
  country: "",
  state: "",
  city: "",
  zipcode: "",
};

export const DEFAULT_VALUES: CreatePaymentLinkValues = {
  paymentDetails: {
    totalAmount: "",
    txnCurrency: "",
    expiry: DEFAULT_EXPIRY_HOURS,
    isRecurringPayment: false,
    productDescription: "",
  },
  recurringPaymentDetails: {
    firstInstalmentDetails: "percentage",
    firstInstalment: "",
    startDate: "",
    numberOfPayments: "",
    frequency: "monthly",
    siSubsequentAmount: "",
  },
  customerDetails: {
    fullName: "",
    emailId: "",
    callingCode: "",
    callingCodeIso2: "",
    phoneNumber: "",
  },
  billingDetails: { ...EMPTY_ADDRESS, shippingSameAsBilling: true },
  shippingDetails: { ...EMPTY_ADDRESS },
};
