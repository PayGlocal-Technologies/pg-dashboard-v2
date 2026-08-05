"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  IconButton,
  PageHeader,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { TOOLTIP_CONTENT_CLASS } from "@/features/dashboard/multi-currency/constants";
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

  // Exactly one account is selected at all times — defaults to the first so
  // Account Details/Action Required are populated immediately on load, not
  // only after an explicit click.
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id ?? "");
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? accounts[0] ?? null;

  const selectAccount = (account: VirtualAccount) => setSelectedAccountId(account.id);

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
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareAll}
              rightIcon={<Icon name="share" className="h-3.5 w-3.5" />}
              disabled={isLoading || accounts.length === 0}
            >
              Share with clients
            </Button>
            {/* Carries the helper copy the old banner used to show
                persistently — same information, now on demand next to the
                action it explains, so it no longer occupies page space. */}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconButton
                    aria-label="About virtual accounts"
                    variant="ghost"
                    size="sm"
                  >
                    <Icon name="info" className="h-4 w-4" />
                  </IconButton>
                </TooltipTrigger>
                <TooltipContent
                  className={cn(TOOLTIP_CONTENT_CLASS, "max-w-xs")}
                  sideOffset={4}
                >
                  {PAGE_DESCRIPTION}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        }
      />

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
          className="flex flex-wrap items-start gap-4 page-enter"
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
            />
          </div>
        </div>
      )}
    </div>
  );
}
