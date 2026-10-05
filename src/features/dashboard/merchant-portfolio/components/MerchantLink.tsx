"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import {
  portfolioMerchantById,
  portfolioPath,
} from "@/features/dashboard/merchant-portfolio/derive";

/**
 * A merchant, as a link to its Merchant Portfolio page: the one merchant
 * detail every partner surface opens. Plain text when the merchant is not in
 * the portfolio (nothing to open).
 */
export function MerchantLink({
  merchantId,
  showId = false,
}: {
  merchantId: string;
  showId?: boolean;
}) {
  const router = useRouter();
  const merchant = portfolioMerchantById(merchantId);
  if (!merchant) {
    return (
      <span className="text-[13px] text-muted-foreground whitespace-nowrap">{merchantId}</span>
    );
  }
  return (
    <span className="flex min-w-0 flex-col items-start">
      <Button
        type="button"
        variant="link"
        onClick={(e) => {
          e.stopPropagation();
          router.push(portfolioPath(merchant.merchantId));
        }}
        className="h-auto min-h-0 max-w-full justify-start truncate p-0 text-[13px]"
      >
        {merchant.name}
      </Button>
      {showId && (
        <span className="font-mono text-[11px] text-muted-foreground">{merchant.merchantId}</span>
      )}
    </span>
  );
}
