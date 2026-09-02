import type { StatusMeta } from "@/features/dashboard/transactions/status/types";
import type { RefundEventStatus } from "@/features/dashboard/transactions/financial/types";

/** One vocabulary for a refund's own status, never a transaction or dispute
 * term (status-vocabulary spec §8). Only these 3 states are ever shown as a
 * refund status chip. */
export const REFUND_STATUS_META: Record<RefundEventStatus, StatusMeta> = {
  PROCESSING: { label: "Processing", variant: "info" },
  COMPLETED: { label: "Completed", variant: "success", trailIcon: "check" },
  FAILED: { label: "Failed", variant: "danger", trailIcon: "x" },
};
