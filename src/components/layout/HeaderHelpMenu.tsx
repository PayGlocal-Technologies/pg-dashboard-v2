"use client";

import { Button, Popover, PopoverContent, PopoverTrigger, Separator } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { CopyableText } from "@/components/common/CopyableText";

/**
 * Merchant support contacts, ported verbatim from pg-dashboard's
 * headerHelpMenu.tsx (HELP_SUPPORT_PHONE / HELP_SUPPORT_EMAIL). Exported so
 * anything else that offers "contact support" uses the same two values rather
 * than a second copy that can drift.
 */
export const HELP_SUPPORT_PHONE = "9240219400";
export const HELP_SUPPORT_EMAIL = "merchant.support@payglocal.in";

/** Production's own wording, kept as-is so both dashboards promise the same hours. */
const HELP_AVAILABILITY = "Available Monday to Friday, 9:30am to 6:30pm IST";

/**
 * One support contact: label, the value itself, and a copy affordance.
 *
 * The value is copyable rather than a tel:/mailto: link, matching the header
 * dropdown in pg-dashboard — on a desktop there is usually nothing to hand a
 * `tel:` off to, and a merchant reading this is far more likely to be pasting
 * the address into whatever they are already writing in.
 */
function HelpContactRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-2 py-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Icon name={icon} className="h-3.5 w-3.5 text-primary" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        {/* min-w-0 on both the row and the value: the support address is nearly
            30 characters and CopyableText's value carries whitespace-nowrap, so
            without a shrinkable chain it pushed its own copy button out through
            the side of the panel. The panel is wide enough for the full address,
            and truncate is the fallback if either value ever grows past it —
            what lands on the clipboard is the whole value regardless. */}
        <CopyableText
          value={value}
          className="min-w-0"
          valueClassName="min-w-0 truncate font-sans text-[13px] font-medium text-foreground"
        />
      </div>
    </div>
  );
}

/**
 * The header's Help button and its menu — a port of pg-dashboard's
 * HeaderHelpDropdown: a "need assistance" heading, the support phone number and
 * email address (both copyable), and the support hours as a closing caption.
 *
 * Same content, rebuilt on this app's Popover rather than antd's Dropdown+Menu,
 * so it reads as one of this header's own surfaces. Two things production has
 * are deliberately not here: the Tour Guide entry, which only appears alongside
 * pg-dashboard's product tour and there is no tour in this app to launch; and
 * the below-`md` bottom sheet, which production gates behind an opt-in used
 * only by the domestic onboarding flow, not by the dashboard header this
 * replaces.
 *
 * Owns its own trigger so the button and the panel it opens cannot drift apart
 * — Header renders `<HeaderHelpMenu />` and nothing else.
 */
export function HeaderHelpMenu() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          // The bell and theme toggle beside it: same 36px square, same muted
          // surface, so the three read as one group of header actions.
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted transition-colors hover:bg-accent"
          aria-label="Help"
        >
          <Icon name="help-circle" size={17} className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      {/* p-0 so the separators below can run the full width of the panel, the
          way the sections of production's menu do. Wide enough to hold the
          support email address on one line.

          onOpenAutoFocus prevented: Radix moves focus to the first focusable
          child on open, which here is the phone number's copy button — and that
          button's tooltip opens on focus, so merely clicking Help popped a
          "Copy" bubble over the panel. Nothing in here needs focus on open
          (there is no field to type in), and Tab still walks the panel for
          keyboard users. */}
      <PopoverContent
        align="end"
        className="w-[320px] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="px-4 py-3">
          <p className="text-[13px] font-semibold text-foreground">Need assistance?</p>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            Merchant support can help with your account, payments and settlements.
          </p>
        </div>

        <Separator />

        <div className="p-2">
          <HelpContactRow icon="phone" label="Call us" value={HELP_SUPPORT_PHONE} />
          <HelpContactRow icon="mail" label="Email us" value={HELP_SUPPORT_EMAIL} />
        </div>

        <Separator />

        <p className="px-4 py-2.5 text-[11px] text-muted-foreground">{HELP_AVAILABILITY}</p>
      </PopoverContent>
    </Popover>
  );
}
