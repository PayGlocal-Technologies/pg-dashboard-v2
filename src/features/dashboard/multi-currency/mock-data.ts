import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

/** Same legal entity receives every currency, so the holder name is shared. */
const ACCOUNT_HOLDER_NAME = "Acme Exports Pvt Ltd";

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
    paymentMethod: "ACH / Fedwire",
    accountHolderName: ACCOUNT_HOLDER_NAME,
    bankName: "Community Federal Savings Bank",
    beneficiaryAddress: "5 Penn Plaza, 14th Floor, New York, NY 10001, US",
    routingCodeType: "ach_routing_number",
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
    paymentMethod: "Faster Payments (FPS)",
    accountHolderName: ACCOUNT_HOLDER_NAME,
    bankName: "Clearbank Ltd",
    beneficiaryAddress: "1 King Street, London, EC2V 8AU, UK",
    routingCodeType: "sort_code",
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
    paymentMethod: "SEPA Credit Transfer",
    accountHolderName: ACCOUNT_HOLDER_NAME,
    bankName: "PayGlocal Europe SA",
    beneficiaryAddress: "Rue de la Loi 200, 1040 Brussels, Belgium",
    routingCodeType: "iban",
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
    paymentMethod: "Local Transfer",
    accountHolderName: ACCOUNT_HOLDER_NAME,
    bankName: "Emirates NBD",
    beneficiaryAddress: "Sheikh Zayed Road, Dubai, UAE",
    routingCodeType: "iban",
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
    paymentMethod: "EFT",
    accountHolderName: ACCOUNT_HOLDER_NAME,
    bankName: "RBC Royal Bank",
    beneficiaryAddress: "100 King Street West, Toronto, ON M5X 1A9, Canada",
    routingCodeType: "transit_number",
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
    paymentMethod: "Direct Entry",
    accountHolderName: ACCOUNT_HOLDER_NAME,
    bankName: "Commonwealth Bank of Australia",
    beneficiaryAddress: "1 Martin Place, Sydney NSW 2000, Australia",
    routingCodeType: "bsb",
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
    paymentMethod: "FAST",
    accountHolderName: ACCOUNT_HOLDER_NAME,
    bankName: "DBS Bank Ltd",
    beneficiaryAddress: "12 Marina View, Singapore 018961",
    routingCodeType: "fast_bank_code",
  },
];
