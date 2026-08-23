"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
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

  async function handleCopy(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      return true;
    } catch {
      // Clipboard access denied — fail silently, the URL is still readable in
      // the field and selectable by hand.
      return false;
    }
  }

  /**
   * Hands the link to the device's own share sheet where there is one — mobile,
   * and Safari and Edge on the desktop. Everywhere else there is no sheet to
   * open, so the link goes to the clipboard instead and says so: the merchant
   * asked to share it, and a button that appeared to do nothing would be worse
   * than one that quietly did the next best thing.
   */
  async function handleShare() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Refer and Earn on PayGlocal",
          text: "Sign up on PayGlocal with my referral link.",
          url: referralUrl,
        });
      } catch {
        // Dismissed, or the sheet refused it. Nothing to report — the merchant
        // closed it themselves, and falling back to the clipboard here would
        // act on a share they just cancelled.
      }
      return;
    }

    if (await handleCopy()) {
      toast.success("Referral link copied", {
        description: "Paste it into a message or email to share it.",
      });
    }
  }

  return (
    // No padding of its own: the banner runs to the card's edges and the content
    // below carries its own. `overflow-hidden` clips the banner's top corners to
    // the card's radius.
    //
    // No height of its own either — not a pixel value and not `h-full`. Beside
    // the right-hand column this card is a stretched grid item, so it takes the
    // row's height. Any slack the row has over this card's content is absorbed
    // between the banner and the content rather than after it: the content block
    // carries `mt-auto` (see below), so the banner stays at the top, the heading,
    // copy, and link field stay pinned to the foot of the card, and the gap
    // between the two opens up instead. Stacked on mobile the card is the only
    // thing in its row, so it is its natural height and the two meet directly.
    <Card className="gap-0 overflow-hidden p-0">
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
          at its foot, so that fade is the breathing room above the heading.

          `mt-auto` keeps this block bottom-aligned in the card. It is the only
          child that can absorb free space, so whenever the card is taller than
          the banner plus this content — which is whenever the row beside it is
          the taller one — the extra height goes above this block and the heading,
          copy, and field stay at the card's foot rather than floating mid-card. */}
      <div className="mt-auto flex flex-col px-5 pb-6 sm:px-8 sm:pb-8">
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
        {/* The field and the share action are two controls on one row, not one
            control: Share sits outside the InputGroup so the group keeps its own
            border and its own inline Copy addon untouched.

            Side by side from sm up — the field takes the slack (`flex-1`, with
            `min-w-0` so a long URL truncates inside it instead of pushing the
            row wider than the card) and the button keeps its natural width.
            Below sm they stack full-width, which is what keeps a narrow viewport
            free of horizontal scroll rather than squeezing two controls onto a
            line that cannot hold them. */}
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <InputGroup className="min-w-0 sm:flex-1">
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
                onClick={() => void handleCopy()}
                leftIcon={<Icon name={copied ? "check" : "copy"} size={13} />}
                aria-label={copied ? "Referral link copied" : "Copy referral link"}
                className="h-8 min-h-8"
              >
                {copied ? "Copied" : "Copy"}
              </Button>
            </InputGroupAddon>
          </InputGroup>

          {/* Secondary to Copy, which is the primary action on this screen, and
              matched to the field's 44px so the two sit on one line rather than
              one riding high against the other. Full-width while stacked. */}
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => void handleShare()}
            leftIcon={<Icon name="share-2" size={14} />}
            className="h-11 min-h-11 w-full shrink-0 sm:w-auto"
          >
            Share link
          </Button>
        </div>
      </div>
    </Card>
  );
}
