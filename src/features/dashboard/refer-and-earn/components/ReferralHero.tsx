"use client";

import { useState } from "react";
import Image from "next/image";
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
import {
  REFERRAL_HERO_ILLUSTRATION,
  REFERRAL_REWARD_LABEL,
} from "@/features/dashboard/refer-and-earn/constants";

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
    <Card className="gap-0 p-5 sm:p-6">
      {/* Two columns from md up: the content takes the slack, the illustration
          column hugs the illustration itself (`auto`) so there is no dead space
          beside it. Rows stretch rather than centre, which is what lets the
          illustration take its height from the row — see below. Below md this
          collapses to one column: heading, copy, and the referral link come
          first, the illustration follows beneath them.

          The row carries a min-height so the hero stands 40% taller than its
          content alone would make it: the heading/copy/link stack measures ~11rem
          (36px heading + 12 + 52px of copy + 32 + 44px field), which with the
          card's 1.5rem padding is a ~14rem card — so a ~16.6rem row puts the card
          at ~19.6rem, i.e. 1.4x. It is a floor, not a fixed height, so longer copy
          still grows the card rather than being clipped. */}
      <div className="grid gap-8 md:min-h-[16.6rem] md:grid-cols-[minmax(0,1fr)_auto] md:gap-6 lg:gap-10">
        {/* The illustration sits close to the card's own edges, so the text
            block carries the hero's generous horizontal inset itself rather
            than taking it from the card's padding. Centred on the card's
            horizontal midline, so the stack sits in the middle of the taller
            hero instead of riding its top edge. */}
        <div className="flex flex-col md:justify-center md:pl-3 lg:pl-8">
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
            <InputGroupAddon align="inline-end">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleCopy}
                leftIcon={<Icon name={copied ? "check" : "copy"} size={13} />}
                aria-label={copied ? "Referral link copied" : "Copy referral link"}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </div>

        {/* The referral illustration. A raster asset, so the icon-registry
            forwardRef pattern in CLAUDE.md does not apply (it is for SVG); it
            goes through next/image per the same file's Images rule. Intrinsic
            dimensions are the file's own, so the 1:1 aspect ratio holds and
            nothing is cropped — object-contain, never a cover/crop treatment.

            From md up it is scaled to the hero itself rather than to a fixed
            size: `h-full` takes the grid row's height (the min-height above, or
            the content if that ever runs taller) and `w-auto` lets the square
            asset derive its own width from it. So the illustration is always
            exactly as tall as the hero's inner row and rescales with it — there
            is no second number to keep in step with the card height. On mobile
            it comes last, as a small centred figure. */}
        <Image
          src={REFERRAL_HERO_ILLUSTRATION.src}
          alt=""
          width={REFERRAL_HERO_ILLUSTRATION.width}
          height={REFERRAL_HERO_ILLUSTRATION.height}
          priority
          sizes="(min-width: 768px) 260px, 220px"
          className="mx-auto h-auto w-full max-w-[220px] rounded-2xl object-contain md:h-full md:w-auto md:max-w-none"
        />
      </div>
    </Card>
  );
}
