"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { usePost } from "@/lib/api/hooks";
import { zohoPaymentSyncApi } from "@/features/dashboard/mca-invoice-details/services";
import type { BaseResponse } from "@/types/common";

type SyncState = "pending-payment" | "payment-synced" | "payment-syncing" | "payment-failed";

const PAID_STATUSES = ["PAID", "PAID_OUTSIDE"];

/**
 * Whether, and how, this invoice's payment has reached Zoho.
 *
 * Ported from pg-dashboard's ZohoSyncLine. Renders nothing at all unless the
 * invoice actually carries a Zoho sync status, so a merchant with no Zoho
 * integration never sees it. The state machine is production's: an unpaid
 * invoice promises a future sync, a paid one reports success, in-flight retry,
 * or failure with a Retry affordance.
 */
export function ZohoSyncLine({
  merchantId,
  invoiceId,
  invoiceStatus,
  zohoPaymentSyncStatus,
  onSynced,
}: {
  merchantId: string;
  invoiceId: string;
  invoiceStatus: string;
  zohoPaymentSyncStatus: "SUCCESS" | "PENDING" | "FAILED" | null | undefined;
  onSynced: () => void;
}) {
  const { mutate: retrySync, isPending: isRetrying } = usePost<
    BaseResponse<null>,
    Record<string, never>
  >(zohoPaymentSyncApi(merchantId, invoiceId), { invalidateQueries: false });

  if (!zohoPaymentSyncStatus) return null;

  let state: SyncState | null = null;
  if (invoiceStatus === "ACTIVE" && zohoPaymentSyncStatus === "PENDING") {
    state = "pending-payment";
  } else if (PAID_STATUSES.includes(invoiceStatus)) {
    // The spinner tracks the in-flight retry, not the stored status.
    if (isRetrying) state = "payment-syncing";
    else if (zohoPaymentSyncStatus === "SUCCESS") state = "payment-synced";
    else state = "payment-failed";
  }

  if (!state) return null;

  const handleRetry = () => {
    retrySync({} as Record<string, never>, {
      onSuccess: () => onSynced(),
      onError: () => toast.error("Retry failed. Please try again."),
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Icon
        name="zoho-logo"
        className={cn("h-4 w-4 shrink-0", state === "payment-failed" && "opacity-50")}
      />

      {state === "pending-payment" && (
        <span className="text-[12px] text-muted-foreground">
          Will be marked paid in Zoho once payment is received
        </span>
      )}

      {state === "payment-synced" && (
        <>
          <span className="text-[12px] text-foreground">Marked paid in Zoho</span>
          <Icon name="check" className="h-3 w-3 text-success" />
        </>
      )}

      {state === "payment-syncing" && (
        <>
          <span className="text-[12px] text-muted-foreground">Marking paid in Zoho…</span>
          <Icon name="loader" className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        </>
      )}

      {state === "payment-failed" && (
        <>
          <span className="text-[12px] text-destructive">Couldn&apos;t mark paid in Zoho</span>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 text-[12px] font-semibold"
            leftIcon={<Icon name="refresh" className="h-3 w-3" />}
            onClick={handleRetry}
          >
            Retry
          </Button>
        </>
      )}
    </div>
  );
}
