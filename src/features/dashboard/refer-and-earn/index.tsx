"use client";

import { toast } from "sonner";
import { Button, Card, InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";

// TODO(integration): this screen is a placeholder only. Wire it up to the
// real referral program endpoints (referral code, reward balance, invite
// history) once that contract exists — see CLAUDE.md's migration checklist.
const REFERRAL_LINK = "https://pgcl.com/refer/YOURCODE";

export function ReferAndEarnFeature() {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(REFERRAL_LINK);
      toast.success("Referral link copied");
    } catch {
      // Clipboard access denied — fail silently, non-critical affordance.
    }
  }

  return (
    <div className="page-enter mx-auto max-w-[1400px] space-y-4 overflow-x-hidden">
      <PageHeader title="Refer & Earn" subtitle="Invite other businesses to PayGlocal and earn rewards" />

      <Card className="items-start gap-4 p-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon name="user-plus" size={20} aria-hidden />
        </span>

        <div>
          <h2 className="text-sm font-semibold text-foreground">Share your referral link</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            When a business you refer signs up and completes their first settlement, you both earn a reward.
          </p>
        </div>

        <InputGroup className="max-w-md">
          <InputGroupInput readOnly value={REFERRAL_LINK} className="font-mono text-xs" />
          <InputGroupAddon align="inline-end">
            <InputGroupButton type="button" onClick={handleCopy} aria-label="Copy referral link">
              <Icon name="copy" size={13} />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>

        <Button type="button" variant="primary" size="sm" onClick={handleCopy}>
          Copy Referral Link
        </Button>
      </Card>
    </div>
  );
}
