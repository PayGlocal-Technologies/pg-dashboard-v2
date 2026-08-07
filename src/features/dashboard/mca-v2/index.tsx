"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, Card, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { RegionSelector } from "@/features/dashboard/multi-currency/components/RegionSelector";
import { ShareAccountDetailsModal } from "@/features/dashboard/multi-currency/components/ShareAccountDetailsModal";
import { VirtualAccountDetails } from "@/features/dashboard/multi-currency/components/VirtualAccountDetails";
import { formatFullAccount } from "@/features/dashboard/multi-currency/utils";
import { MCA_V2_REGIONS } from "@/features/dashboard/mca-v2/constants";
import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

/**
 * MCA v2 — receiving account details, one client region at a time.
 *
 * Where the Virtual Accounts page fans every account out as a scrollable
 * carousel, v2 narrows to a single question: which region is your client
 * paying from? The region list on the left is the only control on the page,
 * and everything on the right (header, account card, share/copy targets) is
 * derived from the one selected account — no navigation, no reload.
 *
 * Nothing here is a new component. The region rows, the account details card
 * and the share modal are the same ones Multi Currency Accounts renders; this
 * file is only the two-column arrangement of them.
 */
export function McaV2Feature() {
  const accounts = MCA_V2_REGIONS;

  // Exactly one region is selected at all times — defaults to the first so
  // the right column is populated on load, not only after a click.
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id ?? "");
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? accounts[0] ?? null;

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
    copyToClipboard(formatFullAccount(account), `${account.countryName} account details copied`);

  /**
   * Uses the OS share sheet where the browser exposes one, and falls back to
   * putting the same text on the clipboard elsewhere — identical to the
   * Virtual Accounts page's own fallback.
   */
  const handleShareAccount = async (account: VirtualAccount) => {
    const text = formatFullAccount(account);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `${account.countryName} Account`, text });
        return;
      } catch {
        // User dismissed the sheet, or the browser refused — fall through to copy.
      }
    }
    await copyToClipboard(text, "Account details copied — ready to send to your client");
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 page-enter">
      <PageHeader title="Multi Currency Accounts" />

      {selectedAccount && (
        <ShareAccountDetailsModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          account={selectedAccount}
          accounts={accounts}
          onCopyLink={(url) => copyToClipboard(url, "Link copied")}
          onCopyFullAccount={handleCopyAccount}
          onShareFullAccount={(account) => void handleShareAccount(account)}
        />
      )}

      {/* Two columns: a fixed-width region selector and everything it drives.
          items-start keeps both top-aligned even though the right column is
          much taller; flex-wrap stacks them on narrow viewports rather than
          squeezing the selector below its readable width. */}
      <div className="flex flex-wrap items-start gap-6">
        <div className="w-full shrink-0 space-y-2 lg:w-[268px]">
          <h2 className="text-xs font-medium text-muted-foreground">Select Client Region</h2>
          <Card className="gap-0 p-2">
            <RegionSelector
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              onSelect={(account) => setSelectedAccountId(account.id)}
              label="Select client region"
              size="md"
            />
          </Card>
        </div>

        {selectedAccount && (
          // key remounts the column on every region change so the fade
          // replays on each switch, not just the first render.
          <div key={selectedAccount.id} className="min-w-0 flex-1 space-y-4 page-enter">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-foreground">
                Receive payments from {selectedAccount.countryName}
              </h2>
              {/* No help article exists yet — the toast is the stand-in until
                  there's somewhere real to point at. */}
              <Button
                variant="link"
                className="text-sm underline"
                onClick={() => toast.info("Help article coming soon")}
              >
                How it works?
              </Button>
            </div>

            {/* Same Account Details card the Virtual Accounts page and the
                share modal render — `inside` moves the flag/name/subtitle into
                the card (there's no carousel here naming the account), and the
                width override drops its default shrink-wrapping so it fills
                this column. */}
            <VirtualAccountDetails
              account={selectedAccount}
              onCopy={handleCopyAccount}
              onShare={() => setShareModalOpen(true)}
              headerPlacement="inside"
              className="w-full max-w-none"
            />

            <Card className="flex-row flex-wrap items-center justify-between gap-4 px-6 py-4">
              <p className="text-sm text-muted-foreground">Need proof of account ownership?</p>
              {/* Placeholder until the proof-of-account document endpoint
                  exists — same stand-in treatment as How it works? above. */}
              <Button
                variant="outline"
                rightIcon={<Icon name="download" className="h-4 w-4" />}
                onClick={() => toast.info("Proof of account ownership will be available soon")}
              >
                Download proof of account ownership
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
