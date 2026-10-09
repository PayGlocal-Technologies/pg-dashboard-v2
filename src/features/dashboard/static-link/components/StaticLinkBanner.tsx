"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui";
import { AppImage } from "@/components/common/AppImage";
import { MERCHANT_SUPPORT_EMAIL } from "@/features/dashboard/payment-button/constants";

/**
 * The design's artwork (public/assets/banner-states): the right half carries
 * the sample link and its "Pay on this link" / "Paid" bubbles, the left half
 * is left plain for the copy. Encoded, since the file name has spaces.
 */
const BANNER_SRC = "/assets/banner-states/Static%20link%20emtpy%20state.png";

/**
 * Static Link's banner, shown until the merchant has a link of their own:
 *
 * - no link on this account (PayGlocal hasn't provisioned one), "Enable it
 *   now": a merchant can't switch the product on themselves, so, as Payment
 *   Button's "Contact us" does, it hands them the support address;
 * - a link that hasn't been set up yet, "Edit Static Link", which opens the
 *   editor where it is named, given its details and switched on.
 *
 * Once the link is set up the page shows the link card instead (see
 * StaticLinkFeature).
 */
export function StaticLinkBanner({
  canEdit,
  onEdit,
}: {
  /** A link exists to set up; false when the account has none yet. */
  canEdit: boolean;
  onEdit: () => void;
}) {
  const requestEnable = () =>
    void navigator.clipboard
      .writeText(MERCHANT_SUPPORT_EMAIL)
      .then(() =>
        toast.success("Support email copied", {
          description: `Write to ${MERCHANT_SUPPORT_EMAIL} to have Static Link enabled.`,
        })
      )
      .catch(() => toast.error(`Write to ${MERCHANT_SUPPORT_EMAIL} to have Static Link enabled.`));

  return (
    <section className="relative isolate overflow-hidden rounded-xl border border-border bg-[#f2f2f2]">
      {/* Anchored right, so a narrower card trims the plain left edge and the
          artwork stays whole. */}
      <AppImage
        src={BANNER_SRC}
        alt=""
        fill
        priority
        sizes="(min-width: 1400px) 1400px, 100vw"
        className="-z-10 object-cover object-right"
      />

      <div className="flex min-h-[220px] flex-col justify-center px-6 py-8 sm:px-10 md:w-1/2 md:min-h-[260px]">
        <h2 className="text-[26px] font-semibold leading-tight tracking-tight text-foreground sm:text-[30px]">
          One link. Multiple payments.
        </h2>
        <p className="mt-3 max-w-md text-[14px] leading-relaxed text-foreground/85">
          Share one permanent payment link with your customers and collect payments whenever
          they&apos;re ready.
        </p>
        <div className="mt-5">
          {canEdit ? (
            <Button type="button" variant="primary" size="sm" onClick={onEdit}>
              Edit Static Link
            </Button>
          ) : (
            <Button
              type="button"
              variant="link"
              onClick={requestEnable}
              // The link variant pads itself and sets 15px; the design sets the
              // link flush with the copy above it, at the body size.
              className="p-0! text-[14px]! font-normal hover:bg-transparent"
            >
              Enable it now
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
