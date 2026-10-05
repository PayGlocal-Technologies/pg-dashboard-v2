"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { Button } from "@/components/ui";
import { MerchantDetailPage } from "@/features/dashboard/my-merchants/components/MerchantDetailPage";
import { usePartnerMerchant } from "@/features/dashboard/my-merchants/hooks";

const LIST_PATH = "/my-merchants";

/** /my-merchants/[onboardingId]: the same merchant workspace, reached by a
 *  direct link. No Collapse, as there is no drawer to return to. */
export function MerchantDetailRoute({ onboardingId }: { onboardingId: string }) {
  const router = useRouter();
  const { data: merchant, isError } = usePartnerMerchant(onboardingId);
  const [nowMs] = useState(() => Date.now());

  if (!merchant || isError) {
    return (
      <div className="page-enter mx-auto max-w-[1400px]">
        <PlaceholderState
          variant={isError ? "error" : "404"}
          title={isError ? "Couldn't load this merchant" : "Merchant not found"}
          description="Open the merchant from your Merchants list to see their details."
          className="py-16"
          action={
            <Button variant="outline" size="sm" onClick={() => router.push(LIST_PATH)}>
              Back to Merchant Activation
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="page-enter">
      <MerchantDetailPage merchant={merchant} nowMs={nowMs} onBack={() => router.push(LIST_PATH)} />
    </div>
  );
}
