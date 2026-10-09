import {
  ADDRESS_LINE_MAX_LENGTH,
  CITY_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  EXTENDED_ALNUM_PATTERN,
  EXTENDED_ALNUM_PATTERN_MESSAGE,
  FREQUENCY_STEP,
  MAX_FIRST_INSTALMENT_PERCENT,
  MAX_NUMBER_OF_PAYMENTS,
  MIN_FIRST_INSTALMENT_PERCENT,
  MIN_NUMBER_OF_PAYMENTS,
  NAME_MAX_LENGTH,
  NAME_TEXT_PATTERN,
  NAME_TEXT_PATTERN_MESSAGE,
  PHONE_MAX_LENGTH,
  ZIPCODE_MAX_LENGTH,
  EXPIRY_OPTIONS,
  FALLBACK_EXPIRY_HOURS,
} from "@/features/dashboard/payment-links/create/constants";
import type {
  AddressDetails,
  CreatePaymentLinkValues,
  InstalmentPlan,
  PaymentLinkConfig,
} from "@/features/dashboard/payment-links/create/types";

// Ported from pg-dashboard's src/features/create-mca-payment-invoice
// (helpers.ts and src/validators), PAYMENT page only. Messages are upstream's.

// ── Validators: a message when invalid, undefined when fine or empty ─────────

const AMOUNT_STRUCTURE_PATTERN = /^[0-9]+(\.[0-9]+)?$/;

/** pg-dashboard's amountFormatValidator: 11 integer digits, 4 decimals. */
function amountFormat(value: string, fieldName: string): string | undefined {
  if (!value) return undefined;
  if (!AMOUNT_STRUCTURE_PATTERN.test(value)) return `${fieldName} must be a valid number`;
  const [integerPart, decimalPart] = value.split(".");
  if (integerPart.length > 11) {
    return `${fieldName} must have at most 11 digits before the decimal point`;
  }
  if (decimalPart && decimalPart.length > 4) {
    return `${fieldName} must have at most 4 digits after the decimal point`;
  }
  return undefined;
}

/** pg-dashboard's minMaxLengthValidator (trimmed length). */
function maxLength(value: string, max: number, fieldName: string): string | undefined {
  if (!value) return undefined;
  return value.trim().length > max ? `${fieldName} must be at most ${max} characters` : undefined;
}

function pattern(value: string, re: RegExp, message: string): string | undefined {
  if (!value) return undefined;
  return re.test(value) ? undefined : message;
}

/** pg-dashboard's minMaxValue. */
function minMaxValue(
  value: string,
  fieldName: string,
  min: number,
  max: number
): string | undefined {
  if (!value) return undefined;
  if (!/^\d+(\.\d+)?$/.test(value) || Number.isNaN(parseFloat(value))) {
    return `The ${fieldName} must be a positive number`;
  }
  const n = parseFloat(value);
  return n >= min && n <= max ? undefined : `The ${fieldName} must be between ${min} and ${max}`;
}

function email(value: string): string | undefined {
  if (!value) return undefined;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ? undefined
    : "Enter an email address in the format name@example.com.";
}

function firstOf(...checks: (string | undefined)[]): string | undefined {
  return checks.find(Boolean);
}

// ── Instalments ──────────────────────────────────────────────────────────────

const formatNum = (val: number): number => Number(Number(val).toFixed(2));

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** `YYYY-MM-DD` plus `n` steps of a frequency, as `YYYY/MM/DD` (upstream's
 *  display format). Month steps clamp to the month's last day, as dayjs does. */
function addSteps(start: string, frequency: string, n: number): string {
  const [y, m, d] = start.split("-").map(Number);
  const step = FREQUENCY_STEP[frequency];
  let date: Date;
  if (step.unit === "day") {
    date = new Date(y, m - 1, d + step.num * n);
  } else {
    const monthIndex = m - 1 + step.num * n;
    const lastDay = new Date(y, monthIndex + 1, 0).getDate();
    date = new Date(y, monthIndex, Math.min(d, lastDay));
  }
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
}

const EMPTY_PLAN: InstalmentPlan = {
  rows: [],
  firstInstalmentAmount: undefined,
  instalmentAmount: undefined,
  adjustment: null,
};

/**
 * The plan a recurring link will run, pg-dashboard's calculateInstalments as a
 * pure function. Upstream rounds every instalment down to a whole number and
 * adds the remainder to the first one, rewriting the first-instalment field
 * to match; here the adjusted figure is returned (and sent), with a note
 * saying by how much, rather than rewriting the field from an effect.
 */
export function calculateInstalmentPlan(
  values: CreatePaymentLinkValues,
  enableNonPercentageSi: boolean
): InstalmentPlan {
  const totalAmount = Number(values.paymentDetails.totalAmount);
  const r = values.recurringPaymentDetails;
  const n = Number(r.numberOfPayments);
  const isPercentage = r.firstInstalmentDetails === "percentage";
  const firstValue = Number(r.firstInstalment);

  if (!totalAmount || !r.numberOfPayments || !r.frequency) return EMPTY_PLAN;
  if (!Number.isInteger(n) || n < MIN_NUMBER_OF_PAYMENTS || n > MAX_NUMBER_OF_PAYMENTS) {
    return EMPTY_PLAN;
  }
  if (!FREQUENCY_STEP[r.frequency]) return EMPTY_PLAN;
  const onDemand = r.frequency === "on-demand";
  if (!onDemand && !r.startDate) return EMPTY_PLAN;

  const dateFor = (i: number) => (onDemand ? "On demand" : addSteps(r.startDate, r.frequency, i));

  if (enableNonPercentageSi) {
    const subsequent = Number(r.siSubsequentAmount);
    if (!subsequent || !Number.isFinite(subsequent) || subsequent < 0.01) return EMPTY_PLAN;
    return {
      rows: Array.from({ length: n }, (_, i) => ({
        sNo: i + 1,
        amount: subsequent,
        date: dateFor(i),
      })),
      firstInstalmentAmount: formatNum(totalAmount),
      instalmentAmount: subsequent,
      adjustment: null,
    };
  }

  if (!firstValue) return EMPTY_PLAN;
  const firstAmount = isPercentage ? (totalAmount * firstValue) / 100 : firstValue;
  const remaining = formatNum(totalAmount - firstAmount);
  if (remaining <= 0) return EMPTY_PLAN;

  const instalmentAmount = Math.floor(formatNum(remaining / n));
  const remainder = formatNum(remaining - instalmentAmount * n);
  let firstInstalmentAmount = formatNum(firstAmount);
  let adjustment: string | null = null;

  if (remainder > 0) {
    firstInstalmentAmount = formatNum(firstAmount + remainder);
    adjustment = isPercentage
      ? `First instalment raised by ${formatNum(
          formatNum((firstInstalmentAmount / totalAmount) * 100) - firstValue
        )}% to ${firstInstalmentAmount}, so every other instalment is a whole number.`
      : `First instalment raised by ${remainder} to ${firstInstalmentAmount}, so every other instalment is a whole number.`;
  }

  return {
    rows: Array.from({ length: n }, (_, i) => ({
      sNo: i + 1,
      amount: instalmentAmount,
      date: dateFor(i),
    })),
    firstInstalmentAmount,
    instalmentAmount,
    adjustment,
  };
}

// ── Validation ───────────────────────────────────────────────────────────────

/** Field errors keyed `section.field`, e.g. `paymentDetails.totalAmount`. */
export type FieldErrors = Record<string, string>;

function addressErrors(section: string, address: AddressDetails, errors: FieldErrors) {
  const checks: [keyof AddressDetails, string | undefined][] = [
    [
      "streetAddress",
      firstOf(
        maxLength(address.streetAddress, ADDRESS_LINE_MAX_LENGTH, "Street Address"),
        pattern(
          address.streetAddress,
          EXTENDED_ALNUM_PATTERN,
          `Street Address ${EXTENDED_ALNUM_PATTERN_MESSAGE}`
        )
      ),
    ],
    [
      "landmark",
      firstOf(
        maxLength(address.landmark, ADDRESS_LINE_MAX_LENGTH, "Landmark"),
        pattern(
          address.landmark,
          EXTENDED_ALNUM_PATTERN,
          `Landmark ${EXTENDED_ALNUM_PATTERN_MESSAGE}`
        )
      ),
    ],
    ["city", maxLength(address.city, CITY_MAX_LENGTH, "City")],
    ["zipcode", maxLength(address.zipcode, ZIPCODE_MAX_LENGTH, "Zipcode")],
  ];
  for (const [field, message] of checks) if (message) errors[`${section}.${field}`] = message;
}

/** Upstream's field rules for the PAYMENT page, against the merchant's config. */
export function validatePaymentLink(
  values: CreatePaymentLinkValues,
  config: PaymentLinkConfig,
  currency: string
): FieldErrors {
  const errors: FieldErrors = {};
  const set = (key: string, message: string | undefined) => {
    if (message) errors[key] = message;
  };
  const p = values.paymentDetails;
  const required = config.plRequiredFields;

  set(
    "paymentDetails.totalAmount",
    p.totalAmount
      ? amountFormat(p.totalAmount, "Payment Amount")
      : "Please enter the Payment Amount"
  );
  if (!currency) set("paymentDetails.txnCurrency", "Please select a currency");
  if (!p.expiry) set("paymentDetails.expiry", "Please select the expiry time");
  set(
    "paymentDetails.productDescription",
    // Required here (the design marks Purpose mandatory); upstream leaves it
    // optional on payment links but applies the same length and pattern.
    !p.productDescription.trim()
      ? "Please enter the Purpose"
      : firstOf(
          maxLength(p.productDescription, DESCRIPTION_MAX_LENGTH, "Purpose"),
          pattern(p.productDescription, NAME_TEXT_PATTERN, `Purpose ${NAME_TEXT_PATTERN_MESSAGE}`)
        )
  );

  if (p.isRecurringPayment) {
    const r = values.recurringPaymentDetails;
    const nonPercentage = !!config.enableNonPercentageSi;
    const total = Number(p.totalAmount) || 0;
    if (!nonPercentage) {
      const isPercentage = r.firstInstalmentDetails === "percentage";
      set(
        "recurringPaymentDetails.firstInstalment",
        !r.firstInstalment
          ? "Please enter the First Instalment"
          : isPercentage
            ? minMaxValue(
                r.firstInstalment,
                "Percentage",
                MIN_FIRST_INSTALMENT_PERCENT,
                MAX_FIRST_INSTALMENT_PERCENT
              )
            : firstOf(
                minMaxValue(
                  r.firstInstalment,
                  "Amount",
                  Number((total * 0.3).toFixed(2)),
                  Number((total * 0.99).toFixed(2))
                ),
                amountFormat(r.firstInstalment, "First Instalment")
              )
      );
    } else {
      set(
        "recurringPaymentDetails.siSubsequentAmount",
        r.siSubsequentAmount
          ? amountFormat(r.siSubsequentAmount, "SI Subsequent Amount")
          : "Please enter the SI subsequent amount"
      );
    }
    if (!r.startDate) set("recurringPaymentDetails.startDate", "Start Date is required");
    set(
      "recurringPaymentDetails.numberOfPayments",
      !r.numberOfPayments
        ? "Please enter the Number of Payments"
        : firstOf(
            minMaxValue(
              r.numberOfPayments,
              "Number of Payments",
              MIN_NUMBER_OF_PAYMENTS,
              MAX_NUMBER_OF_PAYMENTS
            ),
            /^[0-9]+$/.test(r.numberOfPayments) ? undefined : "Please enter a number."
          )
    );
  }

  const c = values.customerDetails;
  set(
    "customerDetails.fullName",
    !c.fullName && required?.customerNameRequired
      ? "Please enter the Full Name"
      : firstOf(
          maxLength(c.fullName, NAME_MAX_LENGTH, "Full Name"),
          pattern(c.fullName, NAME_TEXT_PATTERN, `Full Name ${NAME_TEXT_PATTERN_MESSAGE}`)
        )
  );
  set(
    "customerDetails.emailId",
    !c.emailId && (config.plCustomerSharing || required?.customerEmailIdRequired)
      ? "Please enter the Email ID"
      : firstOf(email(c.emailId), maxLength(c.emailId, EMAIL_MAX_LENGTH, "Email ID"))
  );
  set(
    "customerDetails.phoneNumber",
    !c.phoneNumber && required?.customerPhoneNumberRequired
      ? "Please enter the Phone Number"
      : firstOf(
          maxLength(c.phoneNumber, PHONE_MAX_LENGTH, "Phone Number"),
          pattern(
            c.phoneNumber,
            EXTENDED_ALNUM_PATTERN,
            `Phone Number ${EXTENDED_ALNUM_PATTERN_MESSAGE}`
          )
        )
  );

  addressErrors("billingDetails", values.billingDetails, errors);
  if (!values.billingDetails.shippingSameAsBilling) {
    addressErrors("shippingDetails", values.shippingDetails, errors);
  }
  return errors;
}

// ── Request ──────────────────────────────────────────────────────────────────

/** pg-dashboard's generateUuid(16): 16 uppercase hex characters. */
export function generateMerchantTxnId(): string {
  return Math.floor((1 + Math.random()) * 0x10 ** 16)
    .toString(16)
    .substring(1)
    .toUpperCase();
}

/** Drops empty fields, as upstream's form omits fields never filled in. */
function filled<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== "" && v !== undefined)
  ) as Partial<T>;
}

/**
 * The create request, pg-dashboard's generateCreateLinkRequestBody for the
 * PAYMENT page, field for field. Billing and shipping are the form's own
 * fields spread as they are (upstream does not rename them for this page).
 */
export function buildCreatePaymentLinkRequest(
  values: CreatePaymentLinkValues,
  mid: string,
  currency: string,
  callingCode: string,
  plan: InstalmentPlan
): unknown {
  const p = values.paymentDetails;
  const c = values.customerDetails;
  const r = values.recurringPaymentDetails;
  const billing = filled(values.billingDetails);

  return {
    mid,
    plCustomerData: {
      productDescription: p.productDescription || null,
      fullName: c.fullName || null,
      callingCode: callingCode || null,
      phoneNumber: c.phoneNumber || null,
      emailId: c.emailId || null,
      merchantTxnId: generateMerchantTxnId(),
      totalAmount: p.isRecurringPayment
        ? plan.firstInstalmentAmount || null
        : p.totalAmount || null,
      txnCurrency: currency || null,
      expiry: p.expiry || null,
    },
    plBillingData: {
      ...billing,
      callingCode: callingCode || "",
      phoneNumber: c.phoneNumber || "",
      emailId: c.emailId || "",
      firstName: c.fullName || "",
      lastName: "",
    },
    plShippingData: values.billingDetails.shippingSameAsBilling
      ? billing
      : filled(values.shippingDetails),
    collectByGlobalAltPay: false,
    ...(p.isRecurringPayment && {
      siTxn: true,
      standingInstructionRequest: {
        data: {
          ...(r.frequency !== "on-demand" && { startDate: r.startDate.replaceAll("-", "") }),
          numberOfPayments: r.numberOfPayments || null,
          frequency: r.frequency?.toUpperCase() || null,
          type: "FIXED",
          amount: plan.instalmentAmount || null,
        },
      },
    }),
  };
}

/** "48" → "2 days", "36" → "36 hrs", as upstream's formatLinkExpiryLabelFromHours. */
function expiryLabel(hours: number): string {
  if (hours > 0 && hours % 24 === 0) {
    const days = hours / 24;
    return days === 1 ? "1 day" : `${days} days`;
  }
  return `${hours} hrs`;
}

/**
 * The merchant's default expiry, in hours: the config's `defaultPlExpiryHours`
 * when it is a positive number, else 48, as upstream's CreateLinkForm reads it.
 */
export function defaultExpiryHours(raw: unknown): number {
  const n = Number(raw);
  return raw != null && Number.isFinite(n) && n > 0 ? Math.round(n) : FALLBACK_EXPIRY_HOURS;
}

/**
 * Upstream's buildOrderedLinkExpiryOptions: the default first (labelled as
 * such), then the rest; a default that isn't one of the fixed choices takes
 * the first slot in its place.
 */
export function expiryOptionsFor(defaultHours: number): { value: string; label: string }[] {
  const match = EXPIRY_OPTIONS.find((o) => o.value === defaultHours);
  const ordered = match
    ? [match, ...EXPIRY_OPTIONS.filter((o) => o.value !== match.value)]
    : [{ label: expiryLabel(defaultHours), value: defaultHours }, ...EXPIRY_OPTIONS.slice(1)];
  return ordered.map((o) => ({
    value: String(o.value),
    label: o.value === defaultHours ? `${o.label} (Default)` : o.label,
  }));
}
