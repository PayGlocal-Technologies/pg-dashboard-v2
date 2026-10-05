import { BASE_URL_V1 } from "@/api";
import type { SchedulerView } from "@/features/dashboard/scheduler/types";

// Endpoint URL builders only, ported verbatim from pg-dashboard's
// src/features/scheduler/services.ts.

const SCHEDULER_V1 = `${BASE_URL_V1}/scheduler`;

/** One page of a view. POST SchedulerListRequest → { data: { schedulerData, lastEvaluatedKey } }. */
export const schedulerListApi = (mid: string, view: SchedulerView): string =>
  `${SCHEDULER_V1}/merchant/${mid}/${view}`;

/** CSV of executed transactions for the date window. POST, blob back. */
export const schedulerDownloadApi = (mid: string): string =>
  `${SCHEDULER_V1}/merchant/${mid}/executed/download`;

/** Retry a failed scheduled debit. POST `{ hashOfMandateId, schedulerId }`. */
export const schedulerRetryApi = (mid: string): string => `${SCHEDULER_V1}/merchant/${mid}/retry`;
