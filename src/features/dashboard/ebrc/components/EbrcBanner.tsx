"use client";

import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { AppImage } from "@/components/common/AppImage";

export const EBRC_WHY_ITEMS = [
  "Prove your export payments were received",
  "Claim eligible export benefits and refunds",
  "Keep your export transactions documented in one place",
];

/** The "Why is it needed?" eyebrow + checklist, factored out of the banner's
 *  own render for readability. */
export function EbrcWhyList({ className }: { className?: string }) {
  return (
    <div className={className}>
      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[11px]">
        Why is it needed?
      </p>
      <ul className="mt-2 space-y-1.5">
        {EBRC_WHY_ITEMS.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2 text-[12.5px] text-foreground sm:text-[13px]"
          >
            <Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * eBRC promo banner — shared by the "eBRC" parent landing page
 * (ebrc/index.tsx) and the DGFT connect gate (ebrc-generation's
 * DgftConnectGate), since both point at the same "connect your DGFT
 * account" moment, just from a different entry point (one navigates to the
 * generation flow, the other opens the sign-in dialog right there).
 *
 * public/assets/ebrc banner final1.png reserves a blank left half for real
 * content rather than baking heading/copy into the artwork the way the
 * previous banner did — so all of it renders as actual text here (`alt=""`,
 * the image is decorative now that nothing meaningful only exists inside
 * it), positioned as a percentage of the image's own box so it stays over
 * that blank half as the banner scales with the viewport.
 */
export function EbrcBanner({
  ctaLabel,
  onCtaClick,
}: {
  ctaLabel: string;
  onCtaClick: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border">
      <AppImage
        src="/assets/ebrc banner final1.png"
        alt=""
        width={4680}
        height={1980}
        priority
        className="block h-auto w-full"
      />

      <div className="absolute inset-y-0 left-0 flex w-[46%] flex-col justify-center gap-7 px-[4%] py-[6%]">
        <div className="space-y-2.5">
          <h2 className="text-lg font-semibold leading-tight tracking-tight text-foreground sm:text-xl lg:text-2xl">
            Bring your eBRCs closer to your payments
          </h2>
          <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
            Link your DGFT portal with PayGlocal to connect export payments with eBRCs and
            simplify your compliance workflow.
          </p>
        </div>

        <EbrcWhyList className="space-y-2" />

        <div className="space-y-2">
          <Button type="button" variant="primary" className="w-fit" onClick={onCtaClick}>
            {ctaLabel}
          </Button>
          {/* No "Learn more about eBRC" link here: there's no existing
              PayGlocal help/blog URL for eBRC in this codebase to point it
              at, and inventing one isn't an option. */}
          <p className="text-[11px] text-muted-foreground">Powered by DGFT &amp; PayGlocal</p>
        </div>
      </div>
    </div>
  );
}
