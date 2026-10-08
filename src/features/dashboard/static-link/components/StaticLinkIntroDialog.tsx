"use client";

import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui";
import { AppImage } from "@/components/common/AppImage";
import { Icon } from "@/components/icon";
import { STATIC_LINK_INTRO_BENEFITS } from "@/features/dashboard/static-link/constants";

/**
 * The feature pitch, shown once on the merchant's first visit (pg-dashboard's
 * StaticLinkIntroModal): the pitch beside pg-dashboard's checkout artwork. Afterwards the card's "How it works" opens
 * HowItWorksDialog instead, which explains the link they already have.
 */
export function StaticLinkIntroDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-[56rem] gap-0 overflow-hidden rounded-xl p-0 sm:max-w-[56rem]"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="grid md:grid-cols-2">
          <div className="flex flex-col p-8">
            <span className="w-fit rounded-full bg-primary/10 px-2.5 py-1 text-[12px] font-semibold text-primary">
              Introducing Static Link
            </span>
            <DialogTitle className="mt-3 pr-6 text-2xl font-semibold tracking-tight">
              One link. Unlimited payments.
            </DialogTitle>
            <DialogDescription className="sr-only">
              What a static link lets you do.
            </DialogDescription>

            <ul className="mt-6 space-y-5">
              {STATIC_LINK_INTRO_BENEFITS.map((benefit) => (
                <li key={benefit.title} className="flex gap-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon name={benefit.icon} size={16} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-foreground">
                      {benefit.title}
                    </span>
                    <span className="mt-0.5 block text-[13px] leading-relaxed text-muted-foreground">
                      {benefit.description}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <Button variant="primary" onClick={() => onOpenChange(false)} className="mt-8 w-fit">
              Got it
            </Button>
          </div>

          {/* pg-dashboard's sample checkout artwork, on the right as in its
              StaticLinkModalShell. Decorative (a sample, not this merchant's
              page), so hidden from assistive tech; dropped below md. */}
          <div aria-hidden className="relative hidden min-h-[384px] overflow-hidden md:block">
            <AppImage
              src="/assets/static-link/static-link-popup.png"
              alt=""
              fill
              sizes="448px"
              className="object-cover object-center"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
