"use client";

import { useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui";
import { Icon } from "@/components/icon";
import { useAuthView } from "@/stores/useAuthView";

/**
 * DESIGN MOCK: shown over the demo dashboard right after the mock sign-up.
 * A centred pop-up over a lightly blurred dashboard, one message: a verification email went
 * out. No CTA beyond a quiet "I'll do this later", which is the only way to
 * dismiss it (no close button, no click-outside), so it's read once.
 */
export function VerifyEmailOverlay() {
  const [open, setOpen] = useState(true);
  const email = useAuthView((st) => st.signedUpEmail);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showClose={false}
        overlayClassName="bg-black/20 backdrop-blur-[3px]"
        onInteractOutside={(e) => e.preventDefault()}
        // Keeps the focus ring off the link on open; focus still moves into
        // the dialog and stays trapped there.
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="max-w-[26rem] p-0"
      >
        <div className="flex flex-col items-center px-8 pt-9 pb-7 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon name="mail" className="h-6 w-6" aria-hidden />
          </span>
          <DialogTitle className="mt-5 w-full pr-0 text-center text-xl font-semibold tracking-tight text-foreground">
            Verify your email
          </DialogTitle>
          <DialogDescription className="mt-2 w-full text-center text-[14px] leading-relaxed text-muted-foreground">
            We&apos;ve sent a verification link to{" "}
            <span className="font-medium break-all text-foreground">{email || "your email"}</span>.
            Open it to confirm your email address.
          </DialogDescription>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => setOpen(false)}
            className="mt-6 h-auto min-h-0 p-0 text-[12px] font-normal text-muted-foreground hover:text-foreground"
          >
            I&apos;ll do this later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
