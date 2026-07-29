import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

/**
 * Placeholder virtual accounts for the seven currently supported countries.
 * Every value here is dummy data — replace this module with the real API
 * response once the virtual-accounts endpoint is available. The shape is
 * deliberately identical to what the card component consumes, so wiring the
 * backend up means swapping the source, not touching the UI.
 */
export const MOCK_VIRTUAL_ACCOUNTS: VirtualAccount[] = [
  {
    id: "us-usd",
    iso2: "US",
    countryName: "United States",
    currency: "USD",
    accountName: "USD Account",
    details: [
      { label: "Account Number", value: "0332534665" },
      { label: "ACH Routing", value: "026073150" },
    ],
  },
  {
    id: "gb-gbp",
    iso2: "GB",
    countryName: "United Kingdom",
    currency: "GBP",
    accountName: "GBP Account",
    details: [
      { label: "Account Number", value: "41827396" },
      { label: "Sort Code (FPS)", value: "04-29-09" },
    ],
  },
  {
    id: "eu-eur",
    iso2: "EU",
    countryName: "Europe",
    currency: "EUR",
    accountName: "EUR Account",
    details: [
      { label: "IBAN", value: "DE89 3704 0044 0532 0130 00" },
      { label: "SEPA BIC", value: "PGBLDEFFXXX" },
    ],
  },
  {
    id: "ae-aed",
    iso2: "AE",
    countryName: "United Arab Emirates",
    currency: "AED",
    accountName: "AED Account",
    details: [
      { label: "Local Account Number", value: "019100078234" },
      { label: "IBAN", value: "AE07 0331 2345 6789 0123 456" },
    ],
  },
  {
    id: "ca-cad",
    iso2: "CA",
    countryName: "Canada",
    currency: "CAD",
    accountName: "CAD Account",
    details: [
      { label: "Account Number", value: "7284591036" },
      { label: "Transit Number", value: "00281" },
    ],
  },
  {
    id: "au-aud",
    iso2: "AU",
    countryName: "Australia",
    currency: "AUD",
    accountName: "AUD Account",
    details: [
      { label: "Account Number", value: "428193756" },
      { label: "BSB", value: "062-000" },
    ],
  },
  {
    id: "sg-sgd",
    iso2: "SG",
    countryName: "Singapore",
    currency: "SGD",
    accountName: "SGD Account",
    details: [
      { label: "Account Number", value: "0728451930" },
      { label: "FAST Bank Code", value: "7171" },
    ],
  },
];
