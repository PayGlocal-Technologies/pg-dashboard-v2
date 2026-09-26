"use client";

import { useState } from "react";
import { AppImage as Image } from "@/components/common/AppImage";
import { toast } from "sonner";
import {
  Button,
  Card,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Text,
  VisuallyHidden,
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
    // No height of its own — this card IS stretched to match the right-hand
    // column beside it (`md:items-stretch` in index.tsx, see its own
    // comment). The image itself carries none of that stretch — see its own
    // comment below — a trailing spacer after the content block (bottom of
    // this component) is what absorbs it instead.
    <Card className="gap-0 overflow-hidden p-0">
      {/* The reward banner: sized by width only (`w-full` + `aspect-ratio`),
          fixed — no `h-full`, no `grow`, nothing that lets an external
          stretch touch this box's size. Every previous attempt to make the
          hero match the sidebar's height did so by letting this box itself
          grow, and every one of them eventually let the box's rendered ratio
          drift from the source image's real ratio at some width, which
          forces object-cover to crop unevenly and reads as the image
          visibly distorting. Decoupling the image from the stretch
          entirely — absorbing it elsewhere instead (the trailing spacer
          below) — is what actually stops that from recurring.

          The text content below is a separate block that follows it in
          normal flow, not an overlay positioned on top of it, for the same
          reason: a fixed image box means a fixed handoff point, so the text
          is always the next thing in flow right under it.

          Since the artwork fades to solid white at its own bottom edge, and
          the content block below uses the same white card surface, there's
          no visible seam between the two blocks. */}
      {/* 9:5 frame, a little shorter than the asset's own 2196:1344. With
          object-top, the only thing cropped is the plain white fade at the
          bottom of the artwork, which blends into the white content block
          below anyway. */}
      <div className="relative aspect-9/5 w-full">
        <Image
          src={REFERRAL_HERO_BANNER.src}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 800px, (min-width: 768px) 480px, 100vw"
          className="object-cover object-top"
        />
      </div>

      {/* Centered, not left-aligned: the banner's own artwork carries both
          the "Refer and Earn" title and the $30 figure baked into the image
          itself, so there is no separate on-page heading repeating it
          visually. A VisuallyHidden h1 keeps the page's own heading
          structure intact for screen readers, since the banner image is
          decorative (`alt=""`) and its baked-in text is otherwise invisible
          to them. No top padding here: the banner's own artwork fades out at
          its foot, so that fade is the breathing room above the text. */}
      <div className="flex flex-col items-center px-5 pt-4 pb-6 text-center sm:px-10 sm:pt-6 sm:pb-10">
        <VisuallyHidden as="h1">Refer and Earn</VisuallyHidden>
        <Text size="md" color="subtle" className="max-w-xl leading-relaxed">
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
        <div className="mt-8 flex w-full max-w-xl flex-col gap-2.5 sm:flex-row sm:items-center">
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

      {/* Absorbs any extra height `md:items-stretch` (index.tsx) hands this
          card beyond the image + content's own natural size — a blank
          spacer below the content, not a resize of the image or a repositioning
          of the text. Same technique the right-hand column already uses when
          the roles are reversed and it's the shorter side (see its own
          comment): the taller side gets real content at its natural size,
          the shorter side gets empty room underneath rather than anything
          stretching or distorting to fill the gap. `grow`, not Tailwind's
          `flex-1` — a 0%-basis spacer is still exactly what's wanted here
          since it has no content of its own to protect, but `grow` is used
          for consistency with the one other place in this file that has to
          make the same "won't reach the card's height, but the elements
          inside DO have a floor" tradeoff. */}
      <div className="grow" />
    </Card>
  );
}
