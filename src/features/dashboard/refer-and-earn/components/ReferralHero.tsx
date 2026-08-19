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
    <Card className="gap-0 p-6 sm:p-8 lg:p-10">
      {/* Two columns from md up — tablet keeps the illustration column and lets
          the content column shrink instead. Below md this collapses to one
          column: the copy and the referral link come first, the illustration
          follows beneath them at a reduced size (see below). */}
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
            dimensions are the file's own and `h-auto` keeps them, so the
            aspect ratio holds and nothing is cropped — object-contain rather
            than any cover/crop treatment. Capped and centred on mobile so it
            stays clearly secondary to the copy above it. */}
        <Image
          src={REFERRAL_HERO_ILLUSTRATION.src}
          alt=""
          width={REFERRAL_HERO_ILLUSTRATION.width}
          height={REFERRAL_HERO_ILLUSTRATION.height}
          priority
          className="mx-auto h-auto w-full max-w-[220px] rounded-xl object-contain sm:max-w-[260px] md:mx-0 md:max-w-none"
        />
      </div>
    </Card>
  );
}
