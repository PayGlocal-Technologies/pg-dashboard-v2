import {
  AMOUNT_PATTERN,
  ADDRESS_LINE_MAX_LENGTH,
  CITY_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  EMAIL_PATTERN,
  EXTENDED_ALNUM_PATTERN,
  EXTENDED_ALNUM_PATTERN_MESSAGE,
  INVOICE_ITEM_TEXT_PATTERN,
  INVOICE_ITEM_TEXT_PATTERN_MESSAGE,
  INVOICE_NO_MAX_LENGTH,
  INVOICE_NO_MIN_LENGTH,
  ITEM_TEXT_MAX_LENGTH,
  NAME_MAX_LENGTH,
  NUMERIC_DECIMAL_PATTERN,
  NUMERIC_PATTERN,
  PHONE_MAX_LENGTH,
  ZIPCODE_MAX_LENGTH,
} from "@/features/dashboard/invoice-links/create/constants";
import type {
  AddressValues,
  DiscountType,
  InvoiceCreateRequest,
  InvoiceFormValues,
  InvoiceLineItem,
} from "@/features/dashboard/invoice-links/create/types";

// ── Totals ───────────────────────────────────────────────────────────────────
// Ported expression-for-expression from upstream helpers.ts (getAmount,
// getSubTotalAmount, getDiscountAmount, getTotalAmount). The `|| 0` on getAmount
// is load-bearing: an empty ppu/qty makes the product NaN, and upstream relies
// on that falling through to 0 rather than propagating into the subtotal.

/** Line amount, GST included: ppu × qty + (ppu × qty × tax%). */
export function getAmount(ppu: string, qty: string, tax: string): number {
  const ppuNum = Number(ppu);
  const qtyNum = Number(qty);
  const taxNum = Number(tax);
  return ppuNum * qtyNum + (ppuNum * qtyNum * taxNum) / 100 || 0;
}

/** Sum of every line's GST-inclusive amount. */
export function getSubTotalAmount(items: InvoiceLineItem[]): number {
  return items.reduce((acc, item) => acc + getAmount(item.ppu, item.qty, item.tax ?? "0"), 0);
}

export function getDiscountAmount(
  subTotalAmount: string,
  discount: string,
  discountType: DiscountType
): string {
  const discountNum = Number(discount);
  const subTotalAmountNum = Number(subTotalAmount);
  const discountAmount =
    discountType === "percentage" ? (subTotalAmountNum * discountNum) / 100 : discountNum || 0;
  return discountAmount.toFixed(2);
}

/** Subtotal less discount. */
export function getTotalAmount(
  items: InvoiceLineItem[],
  discount: string,
  discountType: DiscountType
): string {
  const subTotalAmount = getSubTotalAmount(items).toFixed(2);
  const discountAmount = getDiscountAmount(subTotalAmount, discount, discountType);
  return (Number(subTotalAmount) - Number(discountAmount)).toFixed(2) || "0.00";
}

/**
 * "DD/MM/YYYY 00:00:00", which is what the API takes. Upstream builds it with
 * `toLocaleDateString("en-GB")`; this formats the parts explicitly so the
 * result cannot drift with the browser's locale data.
 */
export function getFormattedDueDate(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()} 00:00:00`;
}

/**
 * 16-character reference, upstream's `generateUuid(16)`.
 *
 * crypto.getRandomValues, not Math.random: this runs in an event handler, but
 * the React Compiler rules ban Math.random from render paths and a predictable
 * merchant reference on a payment object is worth avoiding regardless.
 */
export function generateMerchantReference(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Request body ─────────────────────────────────────────────────────────────

/**
 * Builds the create/edit/draft body. One builder for all three, exactly as
 * upstream has it — the three endpoints take the same shape and differ only in
 * URL and verb.
 *
 * Every hardcoded value below (`businessName: ""`, `extraChargeAmount: "0.00"`,
 * the empty `merchantLogo`, `expiry: 6`, `siTxn: false`, …) is upstream's, not
 * an invention here.
 */
export function buildInvoiceRequest(
  values: InvoiceFormValues,
  items: InvoiceLineItem[]
): InvoiceCreateRequest {
  const subTotal = getSubTotalAmount(items).toFixed(2);
  const total = getTotalAmount(items, values.discount || "0", values.discountType);

  return {
    invoiceRequestData: {
      merchantReferenceId: generateMerchantReference(),
      invoiceItems: items.map((item) => ({
        itemDescription: item.description || "",
        itemCode: item.itemCode || null,
        itemPrice: item.ppu || "0",
        quantity: item.qty || "0",
        gstPercentage: item.tax || "0",
        amount: getAmount(item.ppu || "0", item.qty || "0", item.tax || "0").toFixed(2),
      })),
      memo: values.memo || "",
      additionalInfo: values.merchantNote || "",
      totalAmount: total,
      subTotalAmount: subTotal,
      // Upstream sends the same computed figure twice, under two names.
      amountDue: total,
      txnCurrency: values.txnCurrency || "INR",
      formattedDueDate: getFormattedDueDate(values.dueDate),
      invoiceId: values.invoiceNo || null,
      gst: items.some((item) => !!item.tax && item.tax !== "0" && Number(item.tax) !== 0),
      businessName: "",
      discountPercent: values.discountType === "percentage" ? values.discount || null : null,
      discountAmount: getDiscountAmount(subTotal, values.discount || "0", values.discountType),
      extraChargeAmount: "0.00",
      merchantLogo: { name: "", fileExtension: "" },
      additionalEmailId: [],
    },

    plCustomerData: {
      fullName: values.fullName || null,
      emailId: values.emailId || null,
      callingCode: values.callingCode || null,
      phoneNumber: values.phoneNumber || null,
      expiry: 6,
    },

    plBillingData: {
      addressStreet1: values.billing.streetAddress || "",
      addressStreet2: values.billing.landmark || "",
      addressCountry: values.billing.country || "",
      addressState: values.billing.state || "",
      addressCity: values.billing.city || "",
      addressPostalCode: values.billing.zipcode || "",
      // Upstream copies the customer's full name into firstName and leaves
      // lastName empty rather than splitting it.
      firstName: values.fullName || "",
      lastName: "",
      callingCode: values.callingCode || null,
      phoneNumber: values.phoneNumber || "",
      emailId: values.emailId || "",
    },

    // SOURCE DEFECT, PRESERVED DELIBERATELY.
    //
    // Upstream:
    //   plShippingData:
    //     (values?.billingDetails?.shippingSameAsBilling && values?.billingDetails) ||
    //     values?.shippingDetails || null
    //
    // so this field carries the RAW form object — `streetAddress`, `landmark`,
    // `country`, … and, in the same-as-billing case, a stray
    // `shippingSameAsBilling` boolean — while plBillingData above is remapped to
    // the `addressStreet1`/… vocabulary the API documents. The shipping address
    // is therefore in a different shape from the billing one in every branch.
    //
    // Ported byte-identical so this sends exactly what production sends. Raised
    // as a defect separately; do not "fix" it here without confirming what the
    // endpoint actually accepts, because a tolerant backend would start storing
    // different data the moment the shape changed.
    plShippingData: values.shippingSameAsBilling
      ? { ...values.billing, shippingSameAsBilling: true }
      : { ...values.shipping },

    siTxn: false,
    collectByGlobalAltPay: false,
    merchantCustomPayload: null,
  };
}

// ── Field validation ─────────────────────────────────────────────────────────
// Each returns an error string or undefined, the shape @tanstack/react-form
// validators expect. Messages are upstream's, verbatim.

export function validateInvoiceNo(value: string): string | undefined {
  if (!value?.trim()) return "Enter Invoice number";
  if (value.length < INVOICE_NO_MIN_LENGTH || value.length > INVOICE_NO_MAX_LENGTH) {
    return `Invoice number must be between ${INVOICE_NO_MIN_LENGTH} and ${INVOICE_NO_MAX_LENGTH} characters`;
  }
  if (!EXTENDED_ALNUM_PATTERN.test(value)) {
    return `Invoice number ${EXTENDED_ALNUM_PATTERN_MESSAGE}`;
  }
  return undefined;
}

export function validateDueDate(value: string): string | undefined {
  if (!value) return "Select Due Date";
  return undefined;
}

export function validateFullName(value: string): string | undefined {
  if (!value?.trim()) return "Please enter the Full Name";
  if (value.length > NAME_MAX_LENGTH) return `Full Name must be at most ${NAME_MAX_LENGTH} characters`;
  return undefined;
}

export function validateEmail(value: string): string | undefined {
  if (!value?.trim()) return "Please enter the Email ID";
  if (!EMAIL_PATTERN.test(value)) return "Please enter a valid Email ID";
  if (value.length > EMAIL_MAX_LENGTH) return `Email ID must be at most ${EMAIL_MAX_LENGTH} characters`;
  return undefined;
}

export function validatePhone(value: string): string | undefined {
  if (!value?.trim()) return "Please enter the Phone Number";
  if (value.length > PHONE_MAX_LENGTH)
    return `Phone Number must be at most ${PHONE_MAX_LENGTH} characters`;
  if (!EXTENDED_ALNUM_PATTERN.test(value)) {
    return `Phone Number ${EXTENDED_ALNUM_PATTERN_MESSAGE}`;
  }
  return undefined;
}

export function validateDiscount(value: string, discountType: DiscountType): string | undefined {
  if (!value?.trim()) return undefined;
  if (discountType === "percentage") {
    if (!NUMERIC_DECIMAL_PATTERN.test(value)) return "Please enter Discount";
    const n = Number(value);
    if (n < 0 || n > 100) return "Discount must be between 0 and 100";
    return undefined;
  }
  if (!AMOUNT_PATTERN.test(value)) return "Please enter Discount";
  return undefined;
}

/** Address fields are all optional upstream; only length and charset are checked. */
export function validateAddress(values: AddressValues): Partial<Record<keyof AddressValues, string>> {
  const errors: Partial<Record<keyof AddressValues, string>> = {};

  if (values.streetAddress) {
    if (values.streetAddress.length > ADDRESS_LINE_MAX_LENGTH) {
      errors.streetAddress = `Street Address must be at most ${ADDRESS_LINE_MAX_LENGTH} characters`;
    } else if (!EXTENDED_ALNUM_PATTERN.test(values.streetAddress)) {
      errors.streetAddress = `Street Address ${EXTENDED_ALNUM_PATTERN_MESSAGE}`;
    }
  }
  if (values.landmark) {
    if (values.landmark.length > ADDRESS_LINE_MAX_LENGTH) {
      errors.landmark = `Landmark must be at most ${ADDRESS_LINE_MAX_LENGTH} characters`;
    } else if (!EXTENDED_ALNUM_PATTERN.test(values.landmark)) {
      errors.landmark = `Landmark ${EXTENDED_ALNUM_PATTERN_MESSAGE}`;
    }
  }
  if (values.city && values.city.length > CITY_MAX_LENGTH) {
    errors.city = `City must be at most ${CITY_MAX_LENGTH} characters`;
  }
  if (values.zipcode && values.zipcode.length > ZIPCODE_MAX_LENGTH) {
    errors.zipcode = `Zipcode must be at most ${ZIPCODE_MAX_LENGTH} characters`;
  }

  return errors;
}

export type LineItemErrors = Partial<Record<keyof InvoiceLineItem, string>>;

/** Per-cell rules from upstream's InvoiceTable. Description, PPU and Qty are required. */
export function validateLineItem(item: InvoiceLineItem): LineItemErrors {
  const errors: LineItemErrors = {};

  if (!item.description?.trim()) {
    errors.description = "Enter a description";
  } else if (item.description.length > ITEM_TEXT_MAX_LENGTH) {
    errors.description = `Description must be at most ${ITEM_TEXT_MAX_LENGTH} characters`;
  } else if (!INVOICE_ITEM_TEXT_PATTERN.test(item.description)) {
    errors.description = `Description ${INVOICE_ITEM_TEXT_PATTERN_MESSAGE}`;
  }

  if (item.itemCode) {
    if (item.itemCode.length > ITEM_TEXT_MAX_LENGTH) {
      errors.itemCode = `Item Code must be at most ${ITEM_TEXT_MAX_LENGTH} characters`;
    } else if (!INVOICE_ITEM_TEXT_PATTERN.test(item.itemCode)) {
      errors.itemCode = `Item Code ${INVOICE_ITEM_TEXT_PATTERN_MESSAGE}`;
    }
  }

  if (!item.ppu?.trim()) {
    errors.ppu = "Enter a price";
  } else if (!AMOUNT_PATTERN.test(item.ppu)) {
    errors.ppu = "Price per unit must be a valid amount";
  }

  if (!item.qty?.trim()) {
    errors.qty = "Enter a quantity";
  } else if (!NUMERIC_PATTERN.test(item.qty)) {
    errors.qty = "Quantity must be a whole number";
  }

  if (item.tax && !NUMERIC_DECIMAL_PATTERN.test(item.tax)) {
    errors.tax = "Tax must be a number";
  }

  return errors;
}

export function emptyAddress(): AddressValues {
  return { streetAddress: "", landmark: "", country: "", state: "", city: "", zipcode: "" };
}
