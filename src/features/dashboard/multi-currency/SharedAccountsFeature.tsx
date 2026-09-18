"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { RegionSelector } from "@/features/dashboard/multi-currency/components/RegionSelector";
import { VirtualAccountDetails } from "@/features/dashboard/multi-currency/components/VirtualAccountDetails";
import { useSharedVirtualAccounts } from "@/features/dashboard/multi-currency/hooks";
import { formatFullAccount } from "@/features/dashboard/multi-currency/utils";

/**
 * The page a merchant's shared link opens, for the client who has to pay them.
 *
 * Public and unauthenticated: the share token in the path is the only
 * credential, and it addresses a different endpoint from the merchant-facing
 * one (see mcaSharedVirtualAccountsApi). Nothing here reads the session, the
 * merchant's MID, or any store — a visitor has none of those.
 *
 * The layout is the one the merchant already previews inside
 * ShareAccountDetailsModal's "Share via link" tab: region list on the left,
 * that region's account details on the right, one copy action and nothing else.
 * Kept deliberately identical, because that preview is a promise about what the
 * client will see.
 */
export function SharedAccountsFeature({ token }: { token: string }) {
  const { accounts, isLoading, isError } = useSharedVirtualAccounts(token);

  // Exactly one region is selected at all times — defaults to the first, so a
  // client who never touches the list still sees payable details.
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? accounts[0] ?? null;

  const copyAccount = async () => {
    if (!selectedAccount) return;
    try {
      await navigator.clipboard.writeText(formatFullAccount(selectedAccount));
      toast.success("Account details copied");
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  return (
    // Self-contained page shell: this route sits outside the dashboard layout,
    // so it carries its own centering and vertical padding rather than
    // inheriting the sidebar shell's.
    <div className="mx-auto max-w-[1000px] px-4 py-10 sm:px-6 page-enter">
      <header>
        <h1 className="text-xl font-semibold text-foreground">Payment account details</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Use these details to pay by local bank transfer. Pick the region you are paying from.
        </p>
      </header>

      {/* Three states, one layout. A bad or expired token is indistinguishable
          from an empty response at this endpoint, so both resolve to the same
          message — a visitor can act on neither, and saying "expired" when the
          link was merely mistyped would be a guess. */}
      {isLoading ? (
        <div className="mt-8 grid gap-6 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
          <Shimmer className="h-48 w-full rounded-xl" />
          <Shimmer className="h-72 w-full rounded-xl" />
        </div>
      ) : isError || accounts.length === 0 ? (
        <Card size="sm" className="mt-8 items-center gap-2 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            <Icon name="alert-triangle" size={22} />
          </span>
          <p className="mt-2 text-sm font-semibold text-foreground">
            These account details aren&apos;t available
          </p>
          <p className="max-w-sm text-[13px] text-muted-foreground">
            The link may have expired or been mistyped. Ask whoever sent it to share a new one.
          </p>
        </Card>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Select your region</h2>
            <Card size="sm" className="mt-3 gap-0 p-2">
              <RegionSelector
                accounts={accounts}
                selectedAccountId={selectedAccount?.id ?? ""}
                onSelect={(account) => setSelectedAccountId(account.id)}
                label="Regions you can pay from"
              />
            </Card>
          </div>

          {selectedAccount && (
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Account details for payers in {selectedAccount.countryName}
              </h2>

              {/* Same two props the merchant's preview sets, for the same
                  reasons: the flag/name header belongs inside the card since
                  there is no caption above it, and a payer has nothing of their
                  own to share, so copy is the page's only action.
                  key remounts on region change so the fade replays per switch. */}
              <VirtualAccountDetails
                key={selectedAccount.id}
                account={selectedAccount}
                onCopy={copyAccount}
                onShare={() => {}}
                headerPlacement="inside"
                showShare={false}
                className="mt-3 w-full max-w-none"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
