"use client";

import { Card } from "@/components/ui";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { PaymentButtonTransactionsTable } from "@/features/dashboard/payment-button/components/PaymentButtonTransactionsTable";

/**
 * Payments taken through the static link: the PA transaction search scoped by
 * `fieldSearch.productId`, as pg-dashboard's ProductTransactionsCard does,
 * on the same table the payment button's page uses.
 *
 * With no link (not provisioned on this MID yet) there is nothing to scope the
 * search by, so it says so instead of listing every payment on the account.
 */
export function StaticLinkTransactions({
  merchantId,
  productId,
  isLoading,
}: {
  merchantId: string;
  productId?: string;
  isLoading: boolean;
}) {
  if (productId) {
    return (
      <div className="space-y-3">
        <h2 className="text-[15px] font-semibold text-foreground">Linked transactions</h2>
        <PaymentButtonTransactionsTable
          mid={merchantId}
          productId={productId}
          emptyDescription="Payments made through your static link will show up here."
        />
      </div>
    );
  }

  if (isLoading) return null;

  return (
    <Card className="gap-0 p-5">
      <h2 className="text-[15px] font-semibold text-foreground">Linked transactions</h2>
      <PlaceholderState
        variant="empty-table"
        title="No static link on this Merchant ID"
        description="Use the Merchant ID dropdown in the sidebar to select the account your link belongs to."
        className="py-12"
      />
    </Card>
  );
}
