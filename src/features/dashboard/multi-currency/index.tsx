"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, Card, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { VirtualAccountList } from "@/features/dashboard/multi-currency/components/VirtualAccountList";
import { VirtualAccountDetails } from "@/features/dashboard/multi-currency/components/VirtualAccountDetails";
import { VirtualAccountActionRequired } from "@/features/dashboard/multi-currency/components/VirtualAccountActionRequired";
import { MOCK_VIRTUAL_ACCOUNTS } from "@/features/dashboard/multi-currency/mock-data";
import {
  formatAccount,
  formatAllAccounts,
  formatFullAccount,
} from "@/features/dashboard/multi-currency/utils";
import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

const PAGE_DESCRIPTION =
  "Your clients automatically receive the correct international account details based on their location.";

export function MultiCurrencyFeature() {
  // Dummy data for now. Swapping these two for the real query's `data` /
  // `isLoading` is the only change needed once the endpoint exists.
  const [accounts] = useState<VirtualAccount[]>(MOCK_VIRTUAL_ACCOUNTS);
  const isLoading = false;

  // null = nothing expanded, which is the initial state: only the card
  // carousel shows until the user opens an account. Holding a single id here
  // (rather than a per-card flag) is what enforces one-at-a-time expansion —
  // expanding a new account implicitly collapses the previous one.
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);
  const expandedAccount = accounts.find((a) => a.id === expandedAccountId) ?? null;

  const toggleExpand = (account: VirtualAccount) =>
    setExpandedAccountId((current) => (current === account.id ? null : account.id));

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

  const handleShareAll = () => {
    void share("Virtual account details", formatAllAccounts(accounts));
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 page-enter">
      <PageHeader title="Virtual accounts" />

      {/* Hero information container — helper text and the page-level share
          action, grouped into one surface separate from the account cards
          below. flex-wrap lets the button drop under the text on narrow
          viewports instead of forcing a squeeze, while both stay anchored to
          their respective edges at any width that does fit on one line. */}
      <Card className="flex-row flex-wrap items-center justify-between gap-3 px-5 py-4">
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">{PAGE_DESCRIPTION}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleShareAll}
          rightIcon={<Icon name="share" className="h-3.5 w-3.5" />}
          disabled={isLoading || accounts.length === 0}
          className="shrink-0"
        >
          Share with clients
        </Button>
      </Card>

      <VirtualAccountList
        accounts={accounts}
        isLoading={isLoading}
        onCopy={handleCopyAccount}
        onShare={handleShareAccount}
        expandedAccountId={expandedAccountId}
        onToggleExpand={toggleExpand}
      />

      {/* Two-column layout: Account Details sizes to its own content
          (capped at 730px — see VirtualAccountDetails), Transactions fills
          whatever width is left. items-start keeps both top-aligned even
          though their heights differ; flex-wrap drops Transactions below
          Account Details on narrow viewports instead of squeezing either. */}
      {expandedAccount && (
        // key remounts the whole section when a different account is
        // expanded, so the fade replays on every switch (not just the first
        // open) and the transactions table's own page/drawer state resets
        // rather than carrying over from the previously expanded account.
        <div
          key={expandedAccount.id}
          className="flex flex-wrap items-start gap-4 page-enter"
        >
          <VirtualAccountDetails
            account={expandedAccount}
            onCopy={handleCopyFullAccount}
            onShare={handleShareFullAccount}
          />
          <div className="min-w-0 flex-1">
            <VirtualAccountActionRequired
              currency={expandedAccount.currency}
              countryName={expandedAccount.countryName}
            />
          </div>
        </div>
      )}
    </div>
  );
}
