// The create-payment-link form and its API contract, ported from pg-dashboard's
// src/features/create-mca-payment-invoice (the PAYMENT page). Section and
// field names mirror upstream's form paths so the request builder reads the
// same way.

export type FirstInstalmentType = "percentage" | "fixed";

export interface CreatePaymentLinkValues {
  paymentDetails: {
    /** Kept as typed: upstream sends the text input's string. */
    totalAmount: string;
    /** Empty until picked: the merchant's preferred currency stands in. */
    txnCurrency: string;
    /** Hours. */
    expiry: number;
    isRecurringPayment: boolean;
    productDescription: string;
  };
  recurringPaymentDetails: {
    firstInstalmentDetails: FirstInstalmentType;
    firstInstalment: string;
    /** `YYYY-MM-DD`. */
    startDate: string;
    numberOfPayments: string;
    frequency: string;
    siSubsequentAmount: string;
  };
  customerDetails: {
    fullName: string;
    emailId: string;
    /** Empty until picked: India's code stands in. */
    callingCode: string;
    callingCodeIso2: string;
    phoneNumber: string;
  };
  billingDetails: AddressDetails & { shippingSameAsBilling: boolean };
  shippingDetails: AddressDetails;
}

export interface AddressDetails {
  streetAddress: string;
  landmark: string;
  /** ISO2 code. */
  country: string;
  state: string;
  city: string;
  zipcode: string;
}

/** GET …/payment-link-form/config (upstream's PlConfigResponse). */
export interface PaymentLinkConfig {
  merchantSIEnabled?: boolean;
  plCustomerSharing?: boolean;
  maxPlExpiryHours?: number;
  merchantPlPreferredCurrency?: string | null;
  /** Non-percentage SI: a fixed subsequent amount instead of a first-instalment split. */
  enableNonPercentageSi?: boolean;
  plRequiredFields?: {
    customerNameRequired?: boolean;
    customerPhoneNumberRequired?: boolean;
    customerEmailIdRequired?: boolean;
  } | null;
}

export interface CreatePaymentLinkResponse {
  data?: { paymentLink?: string; mcaLink?: string } | null;
}

export interface CurrencyMapResponse {
  data?: { currencyMap?: Record<string, { currencySymbol?: string }> };
}

export interface CountryCurrencyMapResponse {
  data?: { countryCurrencyMap?: { countryName: string; iso2CountryCode: string }[] };
}

export interface CountryStatesResponse {
  data?: { countryCodeModel?: { statesList?: string[] } };
}

export interface CallingCodesResponse {
  data?: {
    countryCallingCodes?: { countryName: string; callingCode: string; iso2CountryCode: string }[];
  };
}

/** The instalment plan a recurring link will run, worked out from the form. */
export interface InstalmentPlan {
  rows: { sNo: number; amount: number; date: string }[];
  /** Sent as the link's own amount: the first instalment, adjusted. */
  firstInstalmentAmount: number | undefined;
  /** Sent as each standing-instruction payment. */
  instalmentAmount: number | undefined;
  /**
   * Upstream rounds each instalment down to a whole number and adds the
   * remainder to the first one; this says by how much, for the merchant.
   */
  adjustment: string | null;
}
