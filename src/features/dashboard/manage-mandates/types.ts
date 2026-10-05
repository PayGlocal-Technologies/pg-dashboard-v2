/** One mandate, as `/search/mandate` returns it (pg-dashboard's ManageMandateData). */
export interface Mandate {
  amount: string | null;
  frequency: string;
  gatewayName: string | null;
  gatewaySiId: string | null;
  /** Hash of the mandate id: what every action sends as `hashOfMandateId`. */
  id: string;
  initiateGid: string;
  initiateProcessorCurrency: string;
  initiateTxnCurrency: string;
  mandateCreationTime: string;
  mandateExhaustionTime: string | null;
  mandateExpiryTime: string | null;
  mandateId: string;
  mandateInactivationTime: string | null;
  /** What the Status column shows. */
  mandateStatus: string;
  maskedMandateId: string;
  maxAmount: string;
  mid: string;
  numberOfPayments: string;
  numberOfPaymentsProcessed: string;
  numberOfPaymentsRemaining: string;
  siId: string;
  /** "YYYYMMDD". */
  startDate: string | null;
  /** What decides which actions apply (ACTIVE / PAUSED), as in pg-dashboard. */
  status: string;
  type: string;
}

export interface MandateListResponse {
  data?: {
    headers?: string[];
    data?: Mandate[];
    totalCount?: number;
  };
}

/** The list request body, the fields pg-dashboard's builder emits for it. */
export interface MandateListRequest {
  pageLimit: number;
  from: number;
  searchFilterType: string;
  fieldOrSearch: Record<string, string[]>;
  fieldSearch?: Record<string, string[]>;
  queryString?: string;
  startTime?: number;
  endTime?: number;
}

export interface MandateSiData {
  amount: string | null;
  maxAmount: string;
  numberOfPayments: string;
  frequency: string;
  startDate: string | null;
  endDate: string | null;
  dueCollectionDate: string | null;
  purpose: string | null;
  type: string;
  mode: string | null;
  scheduledDate: string | null;
  fallbackPlId: string | null;
  fallbackPlLink: string | null;
}

export interface MandateHistoryEntry {
  siData: MandateSiData | null;
  action: string | null;
  updateTime: string;
  formattedUpdateTime: string;
}

export interface MandateHistoryResponse {
  data?: { mandateHistory?: MandateHistoryEntry[] };
}

/** `GET si/config`, read off the top level as pg-dashboard does. */
export interface SiConfigResponse {
  payGlocalScheduler?: boolean;
}

export interface MandateActionResponse {
  data?: { message?: string };
}
