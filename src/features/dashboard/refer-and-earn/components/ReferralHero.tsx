"use client";

import { useState } from "react";
import {
  Card,
  Heading,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  Text,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { REFERRAL_REWARD_LABEL } from "@/features/dashboard/refer-and-earn/constants";

interface ReferralHeroProps {
  /** The full URL that gets copied and shared. */
  referralUrl: string;
}

/**
 * Page hero: the reward headline, the one-line explanation, and the referral
 * link with its Copy action. The right column is a reserved surface for the
 * referral illustration that is still to be authored — see the note on it below.
 */
export function ReferralHero({ referralUrl }: ReferralHeroProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access denied — fail silently, the URL is still readable in
      // the field and selectable by hand.
    }
  }

  return (
    <Card className="gap-0 p-6 sm:p-8 lg:p-10">
      {/* Two columns from md up — tablet keeps the reserved illustration area
          and lets the content column shrink instead. Below md the reserve drops
          out entirely (see below) and this collapses to the single content
          column, so no width is wasted on mobile. */}
      <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,17rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-12">
        <div className="flex flex-col">
          {/* Page title — the hero heading is the h1, so this screen has no
              separate PageHeader competing with it. The reward is the one part
              given the primary colour: it is what the merchant is here for. */}
          <Heading level={1} size="2xl">
            Refer and Earn <span className="text-primary">{REFERRAL_REWARD_LABEL}</span>
          </Heading>

          <Text size="md" color="subtle" className="mt-3 max-w-md leading-relaxed">
            Share PayGlocal with your friends and get rewarded when they complete a transaction.
          </Text>

          {/* Read-only: the link is generated, not typed. Copy is the only
              action, so it rides the field's own inline-end addon rather than
              sitting as a separate button below it. */}
          <InputGroup className="mt-8 max-w-xl">
            <InputGroupInput
              readOnly
              value={referralUrl}
              aria-label="Your referral link"
              className="text-[13px]"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="sm"
                onClick={handleCopy}
                aria-label={copied ? "Referral link copied" : "Copy referral link"}
              >
                <Icon name={copied ? "check" : "copy"} size={13} />
                {copied ? "Copied" : "Copy"}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </div>

        {/* Reserved for the referral illustration asset, which is not authored
            yet — deliberately empty rather than filled with a stand-in graphic.
            When the asset lands it goes through the icon registry (CLAUDE.md)
            and renders here as <Icon name="…" />. Tinted the same as the data
            tables' header surface so an empty reserve still reads as part of
            the card, and hidden below md so mobile gets the content full-width. */}
        <div
          aria-hidden
          className="hidden min-h-[200px] rounded-xl bg-muted/30 md:block lg:min-h-[240px] dark:bg-muted/20"
        />
      </div>
    </Card>
  );
}
