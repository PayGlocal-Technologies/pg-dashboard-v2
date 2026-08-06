"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { useApp } from "@/stores/useApp";
import { TransactionDetailsPage } from "@/features/dashboard/transactions/components/TransactionDetailsPage";
import { VirtualAccountList } from "@/features/dashboard/multi-currency/components/VirtualAccountList";
import { VirtualAccountDetails } from "@/features/dashboard/multi-currency/components/VirtualAccountDetails";
import { ShareAccountDetailsModal } from "@/features/dashboard/multi-currency/components/ShareAccountDetailsModal";
import {
  VirtualAccountActionRequired,
  type ExpandedTransactionConfig,
} from "@/features/dashboard/multi-currency/components/VirtualAccountActionRequired";
import { MOCK_VIRTUAL_ACCOUNTS } from "@/features/dashboard/multi-currency/mock-data";
import { formatAccount, formatFullAccount } from "@/features/dashboard/multi-currency/utils";
import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

export function MultiCurrencyFeature() {
  const isPartnerUser = useApp((s) => s.isPartnerUser);

  // Dummy data for now. Swapping these two for the real query's `data` /
  // `isLoading` is the only change needed once the endpoint exists.
  const [accounts] = useState<VirtualAccount[]>(MOCK_VIRTUAL_ACCOUNTS);
  const isLoading = false;

  // Exactly one account is selected at all times — defaults to the first so
  // Account Details/Action Required are populated immediately on load, not
  // only after an explicit click.
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id ?? "");
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? accounts[0] ?? null;

  const selectAccount = (account: VirtualAccount) => setSelectedAccountId(account.id);

  // Set by VirtualAccountActionRequired's Expand (and cleared by its own
  // Back/Collapse) — see ExpandedTransactionConfig. Rendering the full page
  // here, not inside VirtualAccountActionRequired, is what lets it replace
  // the entire content area below the "Virtual accounts" heading (carousel
  // included) instead of being confined to that panel's own column.
  const [expandedTxn, setExpandedTxn] = useState<ExpandedTransactionConfig | null>(null);

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
      <PageHeader
        title="Virtual accounts"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShareModalOpen(true)}
            rightIcon={<Icon name="share" className="h-3.5 w-3.5" />}
            disabled={!selectedAccount}
          >
            Share with clients
          </Button>
        }
      />

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

      {/* Expanded transaction takes over everything below the heading above
          — carousel included — exactly how McaTransactionTable's own Expand
          replaces the whole Transactions page below its heading. "Back to
          Virtual Accounts" is this entry point's own copy for the same
          onBack callback McaTransactionTable's Back to Transactions uses. */}
      {expandedTxn && (
        <TransactionDetailsPage
          row={expandedTxn.row}
          onBack={expandedTxn.onBack}
          onCollapse={expandedTxn.onCollapse}
          onUploaded={expandedTxn.onUploaded}
          onOpenTransaction={expandedTxn.onOpenTransaction}
          isPartnerUser={isPartnerUser}
          backLabel="Back to Virtual Accounts"
        />
      )}

      {/* Hidden (not unmounted) rather than conditionally rendered while a
          transaction is expanded above: VirtualAccountActionRequired's own
          detailsRowId/drawerOpen state has to survive underneath so that
          Collapse — which the expanded page above calls straight through to
          this component's own collapseToDrawer — can reopen the drawer for
          the same transaction and land back on the same selected account,
          instead of that state having been wiped by an unmount. */}
      <div className={cn(expandedTxn && "hidden")}>
        <VirtualAccountList
          accounts={accounts}
          isLoading={isLoading}
          onCopy={handleCopyAccount}
          onShare={handleShareAccount}
          selectedAccountId={selectedAccount?.id ?? ""}
          onSelect={selectAccount}
        />

        {/* Two-column layout: Account Details sizes to its own content
            (capped at 730px — see VirtualAccountDetails), Action Required
            fills whatever width is left. items-start keeps both top-aligned
            even though their heights differ; flex-wrap drops Action Required
            below Account Details on narrow viewports instead of squeezing
            either. */}
        {selectedAccount && (
          // key remounts the whole section on every selection change, so the
          // fade replays on every switch (not just the first render) and
          // Action Required's own page/drawer state resets rather than
          // carrying over from the previously selected account.
          <div
            key={selectedAccount.id}
            className="mt-4 flex flex-wrap items-start gap-4 page-enter"
          >
            <VirtualAccountDetails
              account={selectedAccount}
              onCopy={handleCopyFullAccount}
              onShare={handleShareFullAccount}
            />
            <div className="min-w-0 flex-1">
              <VirtualAccountActionRequired
                currency={selectedAccount.currency}
                countryName={selectedAccount.countryName}
                iso2={selectedAccount.iso2}
                onExpandedChange={setExpandedTxn}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
