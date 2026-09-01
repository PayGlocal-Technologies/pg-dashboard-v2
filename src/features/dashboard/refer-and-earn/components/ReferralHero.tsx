"use client";

import { useState } from "react";
import { AppImage as Image } from "@/components/common/AppImage";
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
          next/image per the same file's Images rule.

          Below lg: the box holds the asset's own 1660:948 ratio, so nothing is
          scaled unevenly and nothing is cropped — the ticket, the PayGlocal
          mark, the barcode, and the $30 are all always in frame.

          From lg up, the hero's own column is wide enough that this ratio would
          render a banner taller than the right-hand column's Total Earned and
          How-it-works cards combined — the two sides used to only match by
          coincidence at some widths and drift apart at others. `lg:aspect-[1660/705]`
          is a second, shorter ratio calibrated to this exact file: rows 705–948
          of the source image are pure flat colour (checked pixel-by-pixel —
          nothing there but the gradient's own fade), so cropping down to that
          ratio with `object-cover object-top` only ever removes blank margin,
          never the ticket or the bills. It closes most, not all, of the gap —
          the column stays a fixed rem width while the hero's column keeps
          growing with the viewport, so at very wide screens the safe crop alone
          isn't enough to fully match; going further would start cutting into
          the ticket itself. */}
      <div className="relative aspect-[1660/948] w-full lg:aspect-[1660/705]">
        <Image
          src={REFERRAL_HERO_BANNER.src}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 800px, (min-width: 768px) 480px, 100vw"
          className="object-cover object-top"
        />
      </div>

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

              `min-h-0` clears the addon's own `min-h-11`. That 44px minimum is
              the field's full border-box height, so inside the field's 42px
              content box the addon overhangs the bottom by 2px and carries the
              button it centres 1px down with it. Stretched to the content box
              instead, the button's centre is the field's centre — which is what
              lets the Share button beside the field line up with it exactly,
              since that one is centred on the field.

              `has-[>button]:mr-0` carries the same modifier as the addon's own
              `has-[>button]:-mr-[0.4rem]` on purpose: that is what lets
              tailwind-merge drop the -0.4rem pull-in. A plain `mr-0` does not —
              different modifier, so both classes survive the merge and the
              `:has()` variant then wins on specificity, eating the right-hand
              padding and leaving the button overhanging by ~1.4px. */}
            <InputGroupAddon align="inline-end" className="min-h-0 pr-[5px] has-[>button]:mr-0">
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
              the same 32px tall: `size="sm"` and the identical `h-8 min-h-8`
              override the Copy button carries, so the two actions are one height
              whatever Flux's own size scale does. The row's `sm:items-center` is
              what then centres this button on the taller field beside it, so the
              two read as one line rather than one riding high against the other.
              Full-width while stacked, still 32px. */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void handleShare()}
            leftIcon={<Icon name="share-2" size={13} />}
            className="h-8 min-h-8 w-full shrink-0 sm:w-auto"
          >
            Share link
          </Button>
        </div>
      </div>
    </Card>
  );
}
