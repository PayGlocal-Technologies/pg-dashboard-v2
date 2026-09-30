"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { AppImage } from "@/components/common/AppImage";

const POINTS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "layout-template",
    title: "Ready-to-use templates",
    body: "Pick a template for your needs.",
  },
  { icon: "palette", title: "Your branding", body: "Add your logo, colours and business details." },
  { icon: "pencil", title: "Easy to customise", body: "Make every invoice feel like your own." },
];

/**
 * "Create invoices your way": what Invoice Management offers, shown every
 * time the page loads (including a refresh); closing it hides it until the
 * next load.
 *
 * Side by side over a blurred page: a "New update" label, the heading, one
 * line of description, the three points and a single action on the left;
 * the artwork on the right.
 */
export function InvoiceIntroModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Deferred (not a synchronous setState in the effect body), and gives the
    // page its first paint before this opens over it.
    const timer = window.setTimeout(() => setOpen(true), 300);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        overlayClassName="bg-black/20 backdrop-blur-md"
        // Keeps the focus ring off the button on open; focus still moves
        // into the dialog and stays trapped there.
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="max-w-[min(100%-1.5rem,62rem)] overflow-hidden rounded-3xl border-0 p-0 [&>button:last-child]:rounded-full [&>button:last-child]:bg-card/80 [&>button:last-child]:backdrop-blur-sm"
      >
        {/* Side by side: content on the left, artwork on the right (stacked,
            artwork first, on phones). */}
        <div className="flex flex-col-reverse sm:h-[26rem] sm:flex-row">
          <div className="flex min-w-0 flex-col justify-center p-8 sm:min-w-[25rem] sm:flex-1">
            {/* Label above the heading: what kind of announcement this is. */}
            <Badge variant="secondary" size="sm" className="w-fit text-primary">
              New update
            </Badge>
            <DialogTitle className="mt-2.5 pr-0 text-2xl font-bold leading-tight tracking-tight text-foreground">
              Create invoices your way.
            </DialogTitle>
            <DialogDescription className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              Choose a template and personalise it with your brand, colours and design.
            </DialogDescription>

            <ul className="mt-4 space-y-2.5">
              {POINTS.map((point) => (
                <li key={point.title} className="flex items-start gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon name={point.icon} size={13} aria-hidden />
                  </span>
                  <p className="text-[13px] leading-6 text-muted-foreground">
                    <span className="font-medium text-foreground">{point.title}.</span> {point.body}
                  </p>
                </li>
              ))}
            </ul>

            <Button
              type="button"
              variant="primary"
              className="mt-6 w-full sm:w-fit sm:px-8"
              onClick={() => setOpen(false)}
            >
              Got it
            </Button>
          </div>
          {/* Right side: the artwork at its own shape (4572 x 3288) for the
              card's height, so it shows whole. scale-[1.02] trims its rounded
              corners and 1px edge line so it runs flush to the card. On a
              narrow screen it gives way evenly from both sides. */}
          <div className="relative h-52 shrink-0 overflow-hidden bg-muted/60 sm:aspect-4572/3288 sm:h-full sm:shrink">
            <AppImage
              src="/assets/invdesign.png"
              alt=""
              fill
              priority
              sizes="(min-width: 640px) 37rem, 100vw"
              className="scale-[1.02] object-cover object-center"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
