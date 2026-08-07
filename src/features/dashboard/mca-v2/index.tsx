"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, Card, MetricSparklineCard, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { RegionSelector } from "@/features/dashboard/multi-currency/components/RegionSelector";
import { ShareAccountDetailsModal } from "@/features/dashboard/multi-currency/components/ShareAccountDetailsModal";
import { VirtualAccountDetails } from "@/features/dashboard/multi-currency/components/VirtualAccountDetails";
import { formatFullAccount } from "@/features/dashboard/multi-currency/utils";
import { MCA_V2_REGIONS } from "@/features/dashboard/mca-v2/constants";
import { MCA_V2_SUMMARY, TOTAL_EARNING_TREND } from "@/features/dashboard/mca-v2/mock-data";
import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

/** Module title — the step below the page's own h1, shared by both columns. */
const MODULE_TITLE = "text-base font-semibold text-foreground";

/** Supporting copy under a module title, and secondary text inside a module. */
const MODULE_SUBTITLE = "text-[13px] text-muted-foreground";

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
    <div className="mx-auto max-w-[1400px] page-enter">
      {/* mb-8 widens PageHeader's own mb-6 to the 32px this page puts between
          the page header and the first module. */}
      <PageHeader
        title="Virtual Accounts"
        subtitle="Receive international payments using your virtual accounts."
        className="mb-8"
      />

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

      {/* Both columns are titled modules of the same shape: a title block, then
          a white surface carrying that module's content.

          Explicit col-start/row-start rather than one wrapper div per column —
          the same placement technique TransactionDetailsPage's own two-column
          grid uses. Row 1 carries only the left column's title block, so row 2
          is where the region Card and the right column both begin: the summary
          cards' top edge lands exactly on the region Card's, whatever height
          that title block resolves to. Two column wrappers could only match
          those edges by hard-coding a header height.

          DOM order stays left title → left content → right content, so the
          stacked single-column layout below `lg` (where every explicit
          placement drops out) still reads in the right order. gap-x-10 is the
          gutter, gap-y-5 the 20px title → content step. */}
      <div className="grid gap-x-10 gap-y-5 lg:grid-cols-[288px_minmax(0,1fr)] lg:items-start">
        <div className="lg:col-start-1 lg:row-start-1">
          <h2 className={MODULE_TITLE}>Select Client Region</h2>
          <p className={cn(MODULE_SUBTITLE, "mt-1")}>
            Choose the region your customer is sending payment from.
          </p>
        </div>

        {/* p-3 rather than Card's own 28px inset: the rows carry their own
            px-5, so the card's padding only has to keep them clear of its
            edge — anything more and the region names sit adrift of the title
            above the card. */}
        <Card size="sm" className="gap-0 p-3 lg:col-start-1 lg:row-start-2">
          <RegionSelector
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onSelect={(account) => setSelectedAccountId(account.id)}
            label="Select client region"
            size="md"
          />
        </Card>

        {selectedAccount && (
          // space-y-6 is the 24px module → module step: summary row → receive
          // payments section → proof of ownership.
          <div className="space-y-6 lg:col-start-2 lg:row-start-2">
            {/* Three equal columns that collapse to one below `sm` — the same
                surface, padding, and shadow as every other module here, since
                MetricSparklineCard is itself a flux-ui card. Only Total
                Earnings has a series behind it; the other two pass no points,
                so the component simply renders no sparkline rather than being
                given a hand-rolled substitute. */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <MetricSparklineCard
                title="Total Earnings"
                icon={<Icon name="bar-chart" />}
                value={MCA_V2_SUMMARY.totalEarning.value}
                trend={{ direction: "up", label: MCA_V2_SUMMARY.totalEarning.trendLabel }}
                data={TOTAL_EARNING_TREND}
                onInfoClick={() => toast.info(MCA_V2_SUMMARY.totalEarning.info)}
              />
              <MetricSparklineCard
                title="Outstanding"
                icon={<Icon name="clock" />}
                value={MCA_V2_SUMMARY.outstanding.value}
                // "flat" is what keeps this note at muted body colour — it is
                // supporting context, not a movement against a prior period.
                trend={{ direction: "flat", label: MCA_V2_SUMMARY.outstanding.note }}
                data={[]}
                onInfoClick={() => toast.info(MCA_V2_SUMMARY.outstanding.info)}
              />
              <MetricSparklineCard
                title="Amount Saved"
                icon={<Icon name="piggy-bank" />}
                value={MCA_V2_SUMMARY.amountSaved.value}
                // "up" resolves to the design system's own positive/success
                // text colour — the saving is the good outcome being reported.
                trend={{ direction: "up", label: MCA_V2_SUMMARY.amountSaved.note }}
                data={[]}
                onInfoClick={() => toast.info(MCA_V2_SUMMARY.amountSaved.info)}
              />
            </div>

            {/* key remounts the section on every region change so the fade
                replays on each switch, not just the first render. The summary
                row above is deliberately outside it: those figures span every
                region, so they must not flicker when one is picked. */}
            <section key={selectedAccount.id} className="page-enter">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-2">
                <h2 className={MODULE_TITLE}>
                  Receive payments from {selectedAccount.countryName}
                </h2>
                {/* Tertiary action: the link variant carries no fill or
                    border, so it reads as one step below the module title it
                    sits beside. -mr-2 cancels the variant's own horizontal
                    padding so the label's right edge lines up with the card
                    edge below it, and -mt-1 pulls it back onto the title's own
                    line after items-start has top-aligned the row. */}
                <Button
                  variant="link"
                  className="-mr-2 -mt-1 text-[13px] underline"
                  onClick={() => toast.info("Help article coming soon")}
                >
                  How it works?
                </Button>
              </div>

              {/* Same Account Details card the Multi Currency Accounts page
                  and the share modal render — `inside` moves the
                  flag/name/subtitle into the card (there's no carousel here
                  naming the account), and the width override drops its default
                  shrink-wrapping so it fills this column. */}
              <VirtualAccountDetails
                account={selectedAccount}
                onCopy={handleCopyAccount}
                onShare={() => setShareModalOpen(true)}
                headerPlacement="inside"
                className="w-full max-w-none"
              />
            </section>

            {/* Secondary module: same surface and padding as the card above
                it, but its copy sits at supporting weight rather than the
                module-title weight, so it reads as the lesser of the two. */}
            <Card size="sm" className="flex-row flex-wrap items-center justify-between gap-4 py-6">
              <div className="min-w-0 space-y-1">
                <p className="text-[13px] font-medium text-foreground">
                  Need proof of account ownership?
                </p>
                <p className={MODULE_SUBTITLE}>
                  Download an official document confirming ownership of this receiving account.
                </p>
              </div>
              {/* Placeholder until the proof-of-account document endpoint
                  exists — same stand-in treatment as How it works? above. */}
              <Button
                variant="outline"
                className="shrink-0"
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
