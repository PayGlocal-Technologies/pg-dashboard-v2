"use client";

import { toast } from "sonner";
import {
  Button,
  Card,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  PageHeader,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { useReferralLink } from "@/features/dashboard/refer-and-earn/hooks";

// The reward balance and invite history have no surface on this screen yet.
// Their endpoints exist and are recorded in services.ts (referralWalletApi,
// referralTransactionsApi) for whenever the design grows a rewards section.

export function ReferAndEarnFeature() {
  const { link, isLoading, isError } = useReferralLink();

  async function handleCopy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Referral link copied");
    } catch {
      // Clipboard access denied, fail silently, non-critical affordance.
    }
  }

  return (
    <div className="page-enter mx-auto max-w-[1400px] space-y-4 overflow-x-hidden">
      <PageHeader
        title="Refer & Earn"
        subtitle="Invite other businesses to PayGlocal and earn rewards"
      />

      <Card className="items-start gap-4 p-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon name="user-plus" size={20} aria-hidden />
        </span>

        <div>
          <h2 className="text-sm font-semibold text-foreground">Share your referral link</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            When a business you refer signs up and completes their first settlement, you both earn a
            reward.
          </p>
        </div>

        <InputGroup className="max-w-md">
          {/* Same field either way, so the layout never shifts as the link
              arrives. Its value carries the state instead: production shows
              "Generating your referral link..." while the call is in flight, and
              this keeps that behaviour rather than swapping in a skeleton. */}
          <InputGroupInput
            readOnly
            value={
              link ||
              (isError ? "Couldn't load your referral link" : "Generating your referral link...")
            }
            className="font-mono text-xs"
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              type="button"
              onClick={handleCopy}
              disabled={!link}
              aria-label="Copy referral link"
            >
              <Icon name="copy" size={13} />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleCopy}
          disabled={!link || isLoading}
        >
          Copy Referral Link
        </Button>
      </Card>
    </div>
  );
}
