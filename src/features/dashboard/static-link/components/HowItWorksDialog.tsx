"use client";

import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";

const BENEFITS: { icon: IconName; text: string }[] = [
  { icon: "users", text: "Accept payments from multiple customers" },
  { icon: "banknote", text: "Customers can pay any amount via this link" },
];

/** A white disc holding one glyph, floating over the illustration. */
function FloatingIcon({ icon, className }: { icon: IconName; className: string }) {
  return (
    <span
      className={`absolute flex h-12 w-12 items-center justify-center rounded-full bg-card text-primary shadow-sm ${className}`}
    >
      <Icon name={icon} size={18} />
    </span>
  );
}

/**
 * The left half: the link as a customer meets it, a small pay card on a
 * dotted field. Decorative (the right half says it all in words), so it is
 * hidden from assistive tech.
 */
function Illustration({ host }: { host: string }) {
  return (
    <div
      aria-hidden
      className="relative hidden min-h-[384px] overflow-hidden bg-gradient-to-br from-primary/10 via-primary/[0.03] to-card md:block"
    >
      <div
        className="absolute inset-0 opacity-90"
        style={{
          backgroundImage: "radial-gradient(var(--primary) 1.1px, transparent 1.6px)",
          backgroundSize: "18px 18px",
        }}
      />
      <FloatingIcon icon="users" className="top-11 left-9" />
      <FloatingIcon icon="banknote" className="right-16 bottom-10" />

      <div className="absolute top-1/2 left-1/2 w-[230px] -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
        <span className="block h-2.5 w-24 rounded-full bg-muted" />
        <span className="flex items-center gap-2 rounded-lg bg-muted/70 px-3 py-2.5 text-[12.5px] text-foreground/80">
          <Icon name="link" size={13} className="text-primary" />
          {host}/@you
        </span>
        <span className="inline-flex h-9 items-center rounded-full bg-primary px-5 text-[13px] font-semibold text-primary-foreground">
          Pay now
        </span>
      </div>
    </div>
  );
}

/** What a static link is and what it lets the merchant do. */
export function HowItWorksDialog({
  open,
  onOpenChange,
  url,
  host,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  host: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-[56rem] gap-0 overflow-hidden rounded-xl p-0 sm:max-w-[56rem]"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="grid md:grid-cols-2">
          <Illustration host={host} />

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
