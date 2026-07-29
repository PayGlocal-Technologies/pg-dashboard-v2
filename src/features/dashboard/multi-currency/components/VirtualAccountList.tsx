"use client";

import { EmptyState } from "@/components/ui";
import { ICONS } from "@/components/icon/registry";
import { VirtualAccountCard } from "@/features/dashboard/multi-currency/components/VirtualAccountCard";
import { VirtualAccountCardSkeleton } from "@/features/dashboard/multi-currency/components/VirtualAccountCardSkeleton";
import { SKELETON_CARD_COUNT } from "@/features/dashboard/multi-currency/constants";
import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

interface VirtualAccountListProps {
  accounts: VirtualAccount[];
  isLoading?: boolean;
  onCopy: (account: VirtualAccount) => Promise<void> | void;
  onShare: (account: VirtualAccount) => void;
}

/**
 * Horizontally scrolling row of virtual account cards.
 *
 * `overflow-x-auto` + `shrink-0` cards keeps everything on one line at any
 * viewport width, and scroll snapping makes the swipe land on a card edge.
 * Adding more supported countries needs no layout change — the row just gets
 * longer.
 */
export function VirtualAccountList({
  accounts,
  isLoading = false,
  onCopy,
  onShare,
}: VirtualAccountListProps) {
  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-hidden pb-2" aria-busy>
        {Array.from({ length: SKELETON_CARD_COUNT }, (_, i) => (
          <VirtualAccountCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={ICONS.wallet}
        title="No virtual accounts yet"
        description="Once your multi-currency accounts are activated, the receiving details for each supported country will appear here."
      />
    );
  }

  return (
    <div
      className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2"
      role="list"
      aria-label="Virtual receiving accounts"
    >
      {accounts.map((account) => (
        <div key={account.id} role="listitem" className="snap-start">
          <VirtualAccountCard account={account} onCopy={onCopy} onShare={onShare} />
        </div>
      ))}
    </div>
  );
}
