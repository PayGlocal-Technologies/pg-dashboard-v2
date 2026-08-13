// RBI purpose codes for classifying inward remittances (FIRC/EDPMS reporting).
//
// This is a reference table, not merchant data: the code→description mapping
// is set by the RBI and is identical for every merchant, so it ships with the
// UI rather than being fetched. Copied verbatim from pg-dashboard
// (src/features/invoice/constants.ts), which is the production source of
// truth — do not edit a description here without changing it there too.
//
// What is *not* static is which of these a given merchant may choose. That
// comes from the API; see usePurposeCodes in this feature's hooks.ts. This
// table only supplies the human-readable text for whichever codes it returns.
export const PURPOSE_CODES: Record<string, string> = {
  P0102: "Realisation of export bills (in respect of goods) sent on collection (full invoice value)",
  P0103:
    "Advance against export of Goods and Services other than transactions initiated from Nepal and Bhutan",
  P0302: "Business Travel",
  P0304: "Travel for medical treatment including TCs purchased by hospitals",
  P0305: "Travel for education including TCs purchased by educational institutions",
  P0306: "Other Travel Receipts",
  P0601: "Life Insurance premium except term insurance",
  P0602: "Receipts of freight insurance - relating to import and export of goods",
  P0603: "Receipts on account of other general insurance premium",
  P0605: "Receipts on account of Auxiliary services (commission on insurance)",
  P0607: "Insurance Claim Settlement of non-life insurance; and life insurance (only term insurance)",
  P0608: "Life insurance claim settlements (excluding insurance) received by residents in India",
  P0801: "Hardware consultancy implementation",
  P0802: "Software Consultancy Services, Implementation",
  P0803: "Data base, data processing charges",
  P0804: "Repair and maintenance of computer and software",
  P0805: "News agency services",
  P0806: "Other information services- Subscription to newspapers, periodicals, etc.",
  P0807: "Off site Software Exports",
  P0808: "Telecommunication services including electronic mail services and voice mail services",
  P1002: "Trade related services commission on exports imports",
  P1004: "Legal services",
  P1005: "Accounting, auditing, book keeping services",
  P1006: "Business and management consultancy and public relations services",
  P1007: "Advertising trade fair service",
  P1008: "Research and Development services",
  P1009: "Architectural services",
  P1013: "Environmental Services",
  P1014: "Engineering Services",
  P1015: "Tax consulting services",
  P1016: "Market research and public opinion polling service",
  P1017: "Publishing and printing services",
  P1019: "Commission agent services",
  P1020: "Wholesale and retailing trade services",
  P1099: "(Other services not included elsewhere) for export of services",
  P1101:
    "Audio-visual and related services like Motion picture and video tape production, distribution and projection services.",
  P1103: "Radio and television production, distribution and transmission services",
  P1104: "Entertainment services",
  P1105: "Museums, library and archival services",
  P1106: "Recreation and sporting activity services",
  P1107:
    "Payment for educational institutes for services provided by them eg. Tuition, Exam fees, boarding etc",
  P1108: "Payment to Medical Institutes for services provided by them to NRIs and their dependents",
  P1109: "Other Personal, Cultural & Recreational services",
  P1701: "Receipts on account of processing of goods",
};

export interface PurposeCodeOption {
  code: string;
  description: string;
}

const NO_DESCRIPTION = "No description available";

/** Description for a code, tolerant of casing and of codes the table doesn't
 *  know — the API is free to return a code newer than this build. */
export function getPurposeCodeDescription(code: string): string {
  return PURPOSE_CODES[code.toUpperCase()] ?? NO_DESCRIPTION;
}

/** Pairs a list of codes (whatever the API offered) with their descriptions. */
export function toPurposeCodeOptions(codes: string[]): PurposeCodeOption[] {
  return codes.map((code) => ({
    code: code.toUpperCase(),
    description: getPurposeCodeDescription(code),
  }));
}

/** Every known code, used only as the last-resort fallback when the API
 *  offers no narrowed list for this merchant. */
export function allPurposeCodeOptions(): PurposeCodeOption[] {
  return toPurposeCodeOptions(Object.keys(PURPOSE_CODES));
}
