"use client";

import { useState } from "react";
import { Badge, Button, Card, PageHeader, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { useApp } from "@/stores/useApp";
import { useSettlementDetails } from "@/features/dashboard/settings/hooks";

export function BankingFeature() {
  const profile = useApp((s) => s.profile);
  const bankName = profile?.bankName ?? "Not available";

  // Eye toggle, exactly as pg-dashboard's SettlementDetails: masked reads the
  // /settlement endpoint, unmasked swaps to /settlement-details. Starts masked.
  const [masked, setMasked] = useState(true);
  const { settlement, isLoading } = useSettlementDetails(masked);

  // The secure endpoint returns the full number under `accountNumber`, the
  // masked one under `maskedAccountNumber` — prefer whichever the current
  // response carries (see SettlementData).
  const accountNumber = settlement?.accountNumber ?? settlement?.maskedAccountNumber ?? "—";
  const ifscCode = settlement?.ifscCode ?? "—";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Banking & currencies"
        subtitle="Where we send settled funds by currency."
      />

      <Card className="w-full max-w-sm gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon name="landmark" size={18} />
          </span>
          {/* BACKEND GAP: settlement endpoint carries no primary/multi-account
              flag, so this label is not backed by real data yet. */}
          <Badge variant="default" size="sm">
            Primary
          </Badge>
        </div>

        <div>
          <p className="text-sm font-bold text-foreground">{bankName}</p>

          {/* Account number, masked by default with an eye toggle to reveal —
              the real /settlement vs /settlement-details switch. */}
          <div className="mt-1 flex items-center gap-2">
            {isLoading ? (
              <Shimmer className="h-4 w-32" />
            ) : (
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {accountNumber}
              </span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={masked ? "Reveal account number" : "Hide account number"}
              onClick={() => setMasked((prev) => !prev)}
            >
              <Icon name={masked ? "eye" : "eye-off"} className="h-3.5 w-3.5" />
            </Button>
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            IFSC: <span className="font-mono tabular-nums">{ifscCode}</span>
          </p>
        </div>

        {/* BACKEND GAP: account type, settlement currency and a multi-account
            list have no endpoint yet — the /settlement response is only
            IFSC + masked account number. */}
        <p className="border-t border-border pt-3 text-[11px] text-muted-foreground">
          Account type, currency and additional accounts are not yet available.
        </p>
      </Card>
    </div>
  );
}
