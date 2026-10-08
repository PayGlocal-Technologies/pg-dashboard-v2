"use client";

import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui";
import { AppImage } from "@/components/common/AppImage";
import { Icon, type IconName } from "@/components/icon";

const BENEFITS: { icon: IconName; text: string }[] = [
  { icon: "users", text: "Accept payments from multiple customers" },
  { icon: "banknote", text: "Customers can pay any amount via this link" },
];

/**
 * The left half: pg-dashboard's sample checkout artwork
 * (`public/assets/static-link/static-link-popup.png`), cropped to fill the
 * panel. Decorative (the right half says it all in words), so it is hidden
 * from assistive tech.
 */
function Illustration() {
  return (
    <div aria-hidden className="relative hidden min-h-[384px] overflow-hidden md:block">
      <AppImage
        src="/assets/static-link/static-link-popup.png"
        alt=""
        fill
        sizes="448px"
        className="object-cover object-center"
      />
    </div>
  );
}

/** What a static link is and what it lets the merchant do. */
export function HowItWorksDialog({
  open,
  onOpenChange,
  url,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-[56rem] gap-0 overflow-hidden rounded-xl p-0 sm:max-w-[56rem]"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="grid md:grid-cols-2">
          <Illustration />

          <div className="flex flex-col p-8">
            <DialogTitle className="pr-6 text-2xl font-semibold tracking-tight">
              A unique link for your business
            </DialogTitle>
            <DialogDescription className="mt-2 text-[15px]">
              One link you and your customers can always remember.
            </DialogDescription>

            <div className="mt-6 flex h-11 items-center gap-2.5 rounded-lg bg-muted/70 px-4">
              <Icon name="link" size={15} className="shrink-0 text-muted-foreground" />
              <span className="truncate text-[15px] font-semibold text-foreground">{url}</span>
            </div>

            <p className="mt-8 text-sm font-medium text-foreground">With this link, you can:</p>
            <ul className="mt-3 space-y-3">
              {BENEFITS.map((benefit) => (
                <li key={benefit.text} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon name={benefit.icon} size={13} />
                  </span>
                  <span className="text-sm text-muted-foreground">{benefit.text}</span>
                </li>
              ))}
            </ul>

            <Button variant="primary" onClick={() => onOpenChange(false)} className="mt-8 w-full">
              Got it
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
