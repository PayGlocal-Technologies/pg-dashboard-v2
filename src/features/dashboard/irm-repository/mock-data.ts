// TODO(integration): the IRM Repository has no backend yet — see
// ebrc-generation/types.ts for the mapping/process status model this
// repository shares with the eBRC Generation flow it feeds. No backend
// exists, so this is mock data shaped to match the merchant-facing screen
// directly (columns, statuses) so wiring up the real endpoint later is a
// source swap rather than a component rewrite.

import type { MappingStatus, ProcessStatus } from "@/features/dashboard/ebrc-generation/types";

export interface IrmRepositoryRow {
  id: string;
  issueDate: string;
  irmNumber: string;
  remittanceAmount: number;
  currencyCode: string;
  availableAmount: number;
  utilisedAmount: number;
  mappingStatus: MappingStatus;
  processStatus: ProcessStatus;
  remitterName: string;
  remitterCountry: string;
  remitterDate: string;
  purposeOfRemittance: string;
  panNumber: string;
  iecCode: string;
  adCode: string;
  ifscCode: string;
}

export const MOCK_IRM_REPOSITORY_ROWS: IrmRepositoryRow[] = [
  {
    id: "rep-1",
    issueDate: "2024-07-25",
    irmNumber: "CITIN24499713364",
    remittanceAmount: 34211.14,
    currencyCode: "INR",
    availableAmount: 34211.14,
    utilisedAmount: 0,
    mappingStatus: "UNDER_CONSIDERATION",
    processStatus: "PENDING",
    remitterName: "AMAZON.COM, INC",
    remitterCountry: "USA",
    remitterDate: "2023-11-01",
    purposeOfRemittance: "P0103",
    panNumber: "AASHF8973K",
    iecCode: "AASHF8973K",
    adCode: "6392488",
    ifscCode: "ICICI000678",
  },
  {
    id: "rep-2",
    issueDate: "2024-07-17",
    irmNumber: "CITIN24496981812",
    remittanceAmount: 60833.27,
    currencyCode: "INR",
    availableAmount: 60833.27,
    utilisedAmount: 0,
    mappingStatus: "UNMAPPED",
    processStatus: "NOT_STARTED",
    remitterName: "AMAZON.COM, INC",
    remitterCountry: "USA",
    remitterDate: "2023-11-01",
    purposeOfRemittance: "P0103",
    panNumber: "AASHF8973K",
    iecCode: "AASHF8973K",
    adCode: "6392488",
    ifscCode: "ICICI000678",
  },
  {
    id: "rep-3",
    issueDate: "2024-07-11",
    irmNumber: "CITIN24494691980",
    remittanceAmount: 119112.17,
    currencyCode: "INR",
    availableAmount: 119112.17,
    utilisedAmount: 0,
    mappingStatus: "UNMAPPED",
    processStatus: "NOT_STARTED",
    remitterName: "AMAZON.COM, INC",
    remitterCountry: "USA",
    remitterDate: "2023-11-01",
    purposeOfRemittance: "P0103",
    panNumber: "AASHF8973K",
    iecCode: "AASHF8973K",
    adCode: "6392488",
    ifscCode: "ICICI000678",
  },
  {
    id: "rep-4",
    issueDate: "2024-03-11",
    irmNumber: "CITIN24436201051",
    remittanceAmount: 6863.08,
    currencyCode: "INR",
    availableAmount: 3400.0,
    utilisedAmount: 3463.08,
    mappingStatus: "MAPPED",
    processStatus: "COMPLETED",
    remitterName: "AMAZON.COM, INC",
    remitterCountry: "USA",
    remitterDate: "2024-02-14",
    purposeOfRemittance: "P0103",
    panNumber: "AASHF8973K",
    iecCode: "AASHF8973K",
    adCode: "6392488",
    ifscCode: "ICICI000678",
  },
  {
    id: "rep-5",
    issueDate: "2024-03-15",
    irmNumber: "CITIN24438310492",
    remittanceAmount: 175892.47,
    currencyCode: "INR",
    availableAmount: 175892.47,
    utilisedAmount: 0,
    mappingStatus: "UNMAPPED",
    processStatus: "IN_PROGRESS",
    remitterName: "AMAZON.COM, INC",
    remitterCountry: "USA",
    remitterDate: "2024-03-02",
    purposeOfRemittance: "P0103",
    panNumber: "AASHF8973K",
    iecCode: "AASHF8973K",
    adCode: "6392488",
    ifscCode: "ICICI000678",
  },
  {
    id: "rep-6",
    issueDate: "2024-06-04",
    irmNumber: "CITIN24478201439",
    remittanceAmount: 286324.16,
    currencyCode: "INR",
    availableAmount: 286324.16,
    utilisedAmount: 0,
    mappingStatus: "UNDER_CONSIDERATION",
    processStatus: "PENDING",
    remitterName: "AMAZON.COM, INC",
    remitterCountry: "USA",
    remitterDate: "2024-04-19",
    purposeOfRemittance: "P0103",
    panNumber: "AASHF8973K",
    iecCode: "AASHF8973K",
    adCode: "6392488",
    ifscCode: "ICICI000678",
  },
  {
    id: "rep-7",
    issueDate: "2024-06-26",
    irmNumber: "CITIN24486572037",
    remittanceAmount: 254270.2,
    currencyCode: "INR",
    availableAmount: 254270.2,
    utilisedAmount: 0,
    mappingStatus: "UNMAPPED",
    processStatus: "NOT_STARTED",
    remitterName: "AMAZON.COM, INC",
    remitterCountry: "USA",
    remitterDate: "2024-05-01",
    purposeOfRemittance: "P0103",
    panNumber: "AASHF8973K",
    iecCode: "AASHF8973K",
    adCode: "6392488",
    ifscCode: "ICICI000678",
  },
  {
    id: "rep-8",
    issueDate: "2024-07-03",
    irmNumber: "CITIN24491701842",
    remittanceAmount: 22347.96,
    currencyCode: "INR",
    availableAmount: 22347.96,
    utilisedAmount: 0,
    mappingStatus: "UNMAPPED",
    processStatus: "NOT_STARTED",
    remitterName: "AMAZON.COM, INC",
    remitterCountry: "USA",
    remitterDate: "2024-06-12",
    purposeOfRemittance: "P0103",
    panNumber: "AASHF8973K",
    iecCode: "AASHF8973K",
    adCode: "6392488",
    ifscCode: "ICICI000678",
  },
];
