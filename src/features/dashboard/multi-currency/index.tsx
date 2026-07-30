"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { VirtualAccountList } from "@/features/dashboard/multi-currency/components/VirtualAccountList";
import { VirtualAccountDetails } from "@/features/dashboard/multi-currency/components/VirtualAccountDetails";
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

  // null = no explicit selection yet; falls back to the first account once
  // accounts load, so the details section always has something to show.
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const selectedAccount =
    accounts.find((a) => a.id === selectedAccountId) ?? accounts[0] ?? null;

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
      <PageHeader
        title="Virtual accounts"
        subtitle={PAGE_DESCRIPTION}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleShareAll}
            rightIcon={<Icon name="share" className="h-3.5 w-3.5" />}
            disabled={isLoading || accounts.length === 0}
          >
            Share with clients
          </Button>
        }
      />

      <VirtualAccountList
        accounts={accounts}
        isLoading={isLoading}
        onCopy={handleCopyAccount}
        onShare={handleShareAccount}
        selectedAccountId={selectedAccount?.id ?? null}
        onSelect={(account) => setSelectedAccountId(account.id)}
      />

      {selectedAccount && (
        <VirtualAccountDetails
          account={selectedAccount}
          onCopy={handleCopyFullAccount}
          onShare={handleShareFullAccount}
        />
      )}
    </div>
  );
}
