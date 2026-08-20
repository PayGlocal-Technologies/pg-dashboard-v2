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
import { REFERRAL_HERO_BANNER } from "@/features/dashboard/refer-and-earn/constants";

interface ReferralHeroProps {
  /** The full URL that gets copied and shared. */
  referralUrl: string;
}

/**
 * Page hero: the reward banner across the top, then the headline, the one-line
 * explanation, and the referral link with its Copy action. One card, so the
 * artwork and the copy read as a single surface rather than two stacked panels.
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
    // No padding of its own: the banner runs to the card's edges and the content
    // below carries its own. `overflow-hidden` clips the banner's top corners to
    // the card's radius. `h-full` so the card fills its side-by-side grid row.
    <Card className="h-full gap-0 overflow-hidden p-0">
      {/* The reward banner. A raster asset, so the icon-registry forwardRef
          pattern in CLAUDE.md does not apply (it is for SVG); it goes through
          next/image per the same file's Images rule. `w-full h-auto` with the
          file's own intrinsic dimensions holds its 2.3:1 ratio at every width,
          so nothing is scaled unevenly and nothing is cropped — the ticket, the
          PayGlocal mark, the barcode, and the $30 are all always in frame. The
          artwork's own gradient resolves to near-white at its foot, which is
          what lets it meet the card surface without a seam. */}
      <Image
        src={REFERRAL_HERO_BANNER.src}
        alt=""
        width={REFERRAL_HERO_BANNER.width}
        height={REFERRAL_HERO_BANNER.height}
        priority
        sizes="(min-width: 1024px) 800px, (min-width: 768px) 480px, 100vw"
        className="h-auto w-full"
      />

      {/* Content sits below the artwork, left-aligned, with its own horizontal
          and bottom padding. No top padding: the banner's own artwork fades out
          at its foot, so that fade is the breathing room above the heading. */}
      <div className="flex flex-col px-5 pb-6 sm:px-8 sm:pb-8">
        {/* Page title — the hero heading is the h1, so this screen has no
            separate PageHeader competing with it. The reward figure lives in the
            banner above, so it is deliberately not repeated here. */}
        <Heading level={1} size="2xl">
          Refer and Earn
        </Heading>

        <Text size="md" color="subtle" className="mt-2 max-w-md leading-relaxed">
          Share PayGlocal with your friends and get rewarded with $30 when they complete a
          transaction.
        </Text>

        {/* Read-only: the link is generated, not typed. Copy is the primary
            action on this screen, so it takes the filled primary Button and
            rides the field's own inline-end addon — one control group, and the
            input keeps its own styling. The URL truncates within the field on a
            narrow viewport; the full value is what gets copied either way. */}
        <InputGroup className="mt-6 max-w-xl">
          <InputGroupInput
            readOnly
            value={referralUrl}
            aria-label="Your referral link"
            className="truncate text-[13px]"
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
