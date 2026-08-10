"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MetricSparklineCard, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { VirtualAccountList } from "@/features/dashboard/multi-currency/components/VirtualAccountList";
import { VirtualAccountDetails } from "@/features/dashboard/multi-currency/components/VirtualAccountDetails";
import { ShareAccountDetailsModal } from "@/features/dashboard/multi-currency/components/ShareAccountDetailsModal";
import {
  MOCK_VIRTUAL_ACCOUNTS,
  MULTI_CURRENCY_SUMMARY,
  TOTAL_EARNING_TREND,
} from "@/features/dashboard/multi-currency/mock-data";
import { formatAccount, formatFullAccount } from "@/features/dashboard/multi-currency/utils";
import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

export function MultiCurrencyFeature() {
  // Dummy data for now. Swapping these two for the real query's `data` /
  // `isLoading` is the only change needed once the endpoint exists.
  const [accounts] = useState<VirtualAccount[]>(MOCK_VIRTUAL_ACCOUNTS);
  const isLoading = false;

  // Exactly one account is selected at all times — defaults to the first so
  // Account Details is populated immediately on load, not only after an
  // explicit click.
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id ?? "");
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? accounts[0] ?? null;

  const selectAccount = (account: VirtualAccount) => setSelectedAccountId(account.id);

  const [shareModalOpen, setShareModalOpen] = useState(false);

  const copyToClipboard = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  const handleCopyAccount = (account: VirtualAccount) =>
    copyToClipboard(formatAccount(account), `${account.accountName} details copied`);

  // The details section shows every field, not just the card's compact two —
  // its copy/share actions need the fuller text block to match.
  const handleCopyFullAccount = (account: VirtualAccount) =>
    copyToClipboard(formatFullAccount(account), `${account.accountName} details copied`);

  /**
   * Uses the OS share sheet where the browser exposes one, and falls back to
   * putting the same text on the clipboard elsewhere. Replace with the
   * dedicated share flow once it ships.
   */
  const share = async (title: string, text: string) => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text });
        return;
      } catch {
        // User dismissed the sheet, or the browser refused — fall through to copy.
      }
    }
    await copyToClipboard(text, "Account details copied — ready to send to your client");
  };

  const handleShareAccount = (account: VirtualAccount) => {
    void share(account.accountName, formatAccount(account));
  };

  const handleShareFullAccount = (account: VirtualAccount) => {
    void share(`${account.countryName} Account`, formatFullAccount(account));
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 page-enter">
      <PageHeader title="Virtual accounts" />

      {selectedAccount && (
        <ShareAccountDetailsModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          account={selectedAccount}
          accounts={accounts}
          onCopyLink={(url) => copyToClipboard(url, "Link copied")}
          onCopyFullAccount={handleCopyFullAccount}
          onShareFullAccount={handleShareFullAccount}
        />
      )}

      <VirtualAccountList
        accounts={accounts}
        isLoading={isLoading}
        onCopy={handleCopyAccount}
        onShare={handleShareAccount}
        selectedAccountId={selectedAccount?.id ?? ""}
        onSelect={selectAccount}
      />

      {/* Two-column layout: Account Details sizes to its own content
          (capped at 730px — see VirtualAccountDetails), the summary cards
          fill whatever width is left, stacked in their own column rather
          than side by side. items-start keeps both top-aligned even though
          their heights differ; flex-wrap drops the summary cards below
          Account Details on narrow viewports instead of squeezing either. */}
      {selectedAccount && (
        // key remounts the whole section on every selection change, so the
        // fade replays on every switch, not just the first render.
        <div
          key={selectedAccount.id}
          className="mt-4 flex flex-wrap items-start gap-4 page-enter"
        >
          <VirtualAccountDetails
            account={selectedAccount}
            onCopy={handleCopyFullAccount}
            onShare={() => setShareModalOpen(true)}
          />
          {/* Total Earnings/Outstanding span every account, not just the
              selected one, so they don't live inside VirtualAccountDetails'
              own per-account remount above. */}
          <div className="min-w-0 flex-1">
            {/* items-start on the row above aligns both columns to the top
                of the *tallest element in each* — but VirtualAccountDetails'
                own "{Country} Account" caption sits above its Card, so
                without this spacer the row's shared top edge would be that
                caption's top, not the Card's. Same classes as that caption
                (just invisible), rather than a guessed margin value, so the
                two stay pixel-aligned regardless of how its line-height
                actually resolves. Kept outside the space-y-4 below so it
                contributes only its own mb-2 — matching the caption's own
                mb-2-then-Card spacing — not an extra 16px on top of it. */}
            <div aria-hidden className="mb-2 text-[11px] font-semibold uppercase tracking-wide">
              &nbsp;
            </div>
            <div className="space-y-4">
              <MetricSparklineCard
                title="Total Earnings"
                icon={<Icon name="bar-chart" />}
                value={MULTI_CURRENCY_SUMMARY.totalEarnings.value}
                trend={{ direction: "up", label: MULTI_CURRENCY_SUMMARY.totalEarnings.trendLabel }}
                data={TOTAL_EARNING_TREND}
                onInfoClick={() => toast.info(MULTI_CURRENCY_SUMMARY.totalEarnings.info)}
              />
              <MetricSparklineCard
                title="Outstanding"
                icon={<Icon name="clock" />}
                value={MULTI_CURRENCY_SUMMARY.outstanding.value}
                // "flat" is what keeps this note at muted body colour — it's
                // supporting context, not a movement against a prior period.
                trend={{ direction: "flat", label: MULTI_CURRENCY_SUMMARY.outstanding.note }}
                data={[]}
                onInfoClick={() => toast.info(MULTI_CURRENCY_SUMMARY.outstanding.info)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
