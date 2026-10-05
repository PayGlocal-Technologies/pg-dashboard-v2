/** The two views: what ran, and what is due. pg-dashboard's ViewStatus. */
export type SchedulerView = "executed" | "projected";

/** One attempt at a scheduled debit. */
export interface SiCompletionData {
  gid: string;
  txnStatus: string;
  manuallyTriggered: boolean;
}

/** One scheduled debit, as both views return it (pg-dashboard's SchedulerTxnItem). */
export interface SchedulerTxn {
  siId: string;
  successGid: string;
  totalAmount: string;
  txnCurrency: string;
  status: string;
  scheduledTime: string;
  creationTime: string;
  executionTime: string;
  siCompletionDataList: SiCompletionData[];
  enabledManualExecution: boolean;
  hashOfMandateId: string;
  schedulerId: string;
  initiateGid: string;
  merchantId?: string;
}

/** The list body, every field pg-dashboard sends. Dates are "YYYY-MM-DD". */
export interface SchedulerListRequest {
  scheduledDataType: "STANDING_INSTRUCTION";
  schedulerViewFilterType: "DATE_RANGE" | "DATE_RANGE_STATUS";
  startDate: string;
  endDate: string;
  scheduledDataStatus: string | null;
  pageLimit: number;
  /** The previous page's `lastEvaluatedKey`; null for the first page. */
  exclusiveStartKey: object | null;
}

export interface SchedulerListResponse {
  data?: {
    schedulerData?: SchedulerTxn[];
    lastEvaluatedKey?: object | null;
  };
}

export interface SchedulerRetryRequest {
  hashOfMandateId: string;
  schedulerId: string;
}

/** Retry answers with the debit's own status at the top level. */
export interface SchedulerRetryResponse {
  status?: string;
  message?: string;
}
