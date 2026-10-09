"use client";

import type { ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { AppImage } from "@/components/common/AppImage";
import { MERCHANT_SUPPORT_EMAIL } from "@/constants/support";

/**
 * A product page's banner (public/assets/banner-states): the design's
 * artwork carries its illustration on the right half and leaves the left
 * half plain, where the headline, the line under it and the one action sit.
 *
 * The image is anchored right, so a narrower card trims the plain left edge
 * and the illustration stays whole; on a phone the copy simply sits over it.
 */
export function FeatureBanner({
  imageSrc,
  title,
  description,
  action,
}: {
  /** Root-relative path under public/, e.g. "/assets/banner-states/static-link.webp". */
  imageSrc: string;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden rounded-xl border border-border bg-[#f2f2f2]">
      <AppImage
        src={imageSrc}
        alt=""
        fill
        priority
        sizes="(min-width: 1400px) 1400px, 100vw"
        className="-z-10 object-cover object-right"
      />

      <div className="flex min-h-[220px] flex-col justify-center px-6 py-8 sm:px-10 md:min-h-[260px] md:w-1/2">
        <h2 className="text-[26px] font-semibold leading-tight tracking-tight text-foreground sm:text-[30px]">
          {title}
        </h2>
        <p className="mt-3 max-w-md text-[14px] leading-relaxed text-foreground/85">
          {description}
        </p>
        <div className="mt-5">{action}</div>
      </div>
    </section>
  );
}

/**
 * "Enable it now", for a product the merchant can't switch on themselves:
 * like Payment Button's "Contact us", it hands them the support address
 * (copied, with the address in the toast too in case the copy is blocked).
 */
export function EnableProductAction({
  product,
  label = "Enable it now",
}: {
  product: string;
  /** The design's wording for the page, "Enable it now" unless it says otherwise. */
  label?: string;
}) {
  const message = `Write to ${MERCHANT_SUPPORT_EMAIL} to have ${product} enabled.`;
  const requestEnable = () =>
    void navigator.clipboard
      .writeText(MERCHANT_SUPPORT_EMAIL)
      .then(() => toast.success("Support email copied", { description: message }))
      .catch(() => toast.error(message));

  return (
    <Button
      type="button"
      variant="link"
      onClick={requestEnable}
      // The link variant pads itself and sets 15px; the design sets the link
      // flush with the copy above it, at the body size.
      className="p-0! text-[14px]! font-normal hover:bg-transparent"
    >
      {label}
    </Button>
  );
}
