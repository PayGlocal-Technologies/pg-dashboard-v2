export interface PurposeCode {
  code: string;
  description: string;
}

// A representative subset of RBI purpose codes used to classify inward
// remittances for FIRC/EDPMS reporting.
// TODO: replace with the merchant's actual purpose-code master list once a
// backend endpoint exists (see CLAUDE.md — do not guess API contracts).
export const PURPOSE_CODES: PurposeCode[] = [
  { code: "P0101", description: "Software consultancy and implementation" },
  { code: "P0102", description: "Off-site software exports" },
  { code: "P0103", description: "On-site software exports" },
  { code: "P0104", description: "Business/management consultancy services" },
  { code: "P0201", description: "Hardware exports and maintenance" },
  { code: "P0802", description: "Legal, accounting and business services" },
  { code: "P0805", description: "Advertising, trade fair and market research" },
  { code: "P1006", description: "Freight on exports (air/sea)" },
  { code: "P1301", description: "Personal gifts and donations" },
  { code: "P1401", description: "Royalties, trademarks and licence fees" },
];
