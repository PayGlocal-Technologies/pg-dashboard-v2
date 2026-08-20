"use client";

import { useState } from "react";
import {
  Button,
  Card,
  Heading,
  InputGroup,
  InputGroupAddon,
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
 * Page hero: the reward headline, the one-line explanation, and the referral link
 * with its Copy action — the page's primary promotional surface. It carries no
 * illustration; the space to its right belongs to the leaderboard card, which the
 * page composes beside this one.
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
    <Card className="h-full gap-0 p-5 sm:p-6">
      {/* Single column now that the illustration is gone. The min-height keeps the
          hero's established stature — it stood 40% taller than its bare content —
          so removing the image doesn't collapse the card, and it stays a floor
          rather than a fixed height so longer copy still expands it. Content sits
          on the card's horizontal midline. */}
      <div className="flex h-full flex-col justify-center md:min-h-[16.6rem] md:pl-3">
        {/* Page title — the hero heading is the h1, so this screen has no
            separate PageHeader competing with it. The reward is the one part
            given the primary colour: it is what the merchant is here for. */}
        <Heading level={1} size="2xl">
          Refer and Earn <span className="text-primary">{REFERRAL_REWARD_LABEL}</span>
        </Heading>

        <Text size="md" color="subtle" className="mt-3 max-w-md leading-relaxed">
          Share PayGlocal with your friends and get rewarded when they complete a transaction.
        </Text>

        {/* Read-only: the link is generated, not typed. Copy is the primary
            action on this screen, so it takes the filled primary Button and
            rides the field's own inline-end addon rather than sitting as a
            separate button below it — the input keeps its own styling. */}
        <InputGroup className="mt-8 max-w-xl">
          <InputGroupInput
            readOnly
            value={referralUrl}
            aria-label="Your referral link"
            className="text-[13px]"
          />
          {/* Even spacing around the Copy button. The field is 44px tall with a
              1px border, so its content box is 42px; a 32px button centred in
              that leaves 5px above and below, and `pr-[5px]` puts the same 5px
              to its right — an equal 5px inset on all three of the button's free
              edges. 32px is Flux's own in-field button height, and the field's
              height and the input's styling are untouched.

              `has-[>button]:mr-0` carries the same modifier as the addon's own
              `has-[>button]:-mr-[0.4rem]` on purpose: that is what lets
              tailwind-merge drop the -0.4rem pull-in. A plain `mr-0` does not —
              different modifier, so both classes survive the merge and the
              `:has()` variant then wins on specificity, eating the right-hand
              padding and leaving the button overhanging by ~1.4px. */}
          <InputGroupAddon align="inline-end" className="pr-[5px] has-[>button]:mr-0">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleCopy}
              leftIcon={<Icon name={copied ? "check" : "copy"} size={13} />}
              aria-label={copied ? "Referral link copied" : "Copy referral link"}
              className="h-8 min-h-8"
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </Card>
  );
}
