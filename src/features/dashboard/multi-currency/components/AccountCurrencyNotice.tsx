"use client";

import { useState } from "react";
import { Button, Dialog, DialogContent, DialogTitle, Separator } from "@/components/ui";
import { Icon } from "@/components/icon";

/**
 * Currency-specific warnings shown beside an account's details, plus the guide
 * each one links to.
 *
 * Ported from pg-dashboard's VirtualAccounts page, which renders exactly two of
 * these — one when AUD is selected, one for the SWIFT catch-all — each opening
 * its own guide modal (AudGuideModal / GlobalGuideModal). They exist because
 * both rails have a failure mode the merchant can only prevent by briefing
 * their client in advance, so the warning belongs next to the details they are
 * about to send, not in a help centre.
 *
 * Anything else renders nothing at all.
 */

/** Which notice, if any, a currency carries. */
type NoticeKind = "aud" | "global" | null;

function noticeKindFor(currency: string): NoticeKind {
  if (currency === "AUD") return "aud";
  // "GLOBAL" is the SWIFT catch-all — see mapAccounts. pg-dashboard keys the
  // same notice off the same value.
  if (currency === "GLOBAL") return "global";
  return null;
}

function AudGuideDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(100%,34rem)] p-6 [&>button:last-child]:top-6">
        <DialogTitle className="text-base font-semibold text-foreground">
          Is your client facing any of these errors?
        </DialogTitle>

        <Separator className="my-4 border-dashed" />

        <p className="text-[13px] text-muted-foreground">
          If your client&apos;s bank shows errors like &lsquo;Payment rejected&rsquo;, &lsquo;Account
          appears closed&rsquo; or &lsquo;Delays in receiving payment&rsquo;, you can do the
          following:
        </p>

        <p className="mt-5 text-sm font-semibold text-foreground">Steps to guide your client:</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px] text-muted-foreground">
          <li>
            Ask your client to select &lsquo;I trust this account&rsquo; or &lsquo;Confirm
            payment&rsquo; on their banking portal.
          </li>
          <li>Retry after 3 hours.</li>
          <li>Use the BECS payment method instead of NPP.</li>
          <li>
            If the issue persists, please reach out to{" "}
            <span className="text-foreground">merchant.support@payglocal.in</span>
          </li>
        </ul>

        <div className="mt-6 flex justify-end">
          <Button variant="primary" onClick={() => onOpenChange(false)}>
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GlobalGuideDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(100%,34rem)] p-6 [&>button:last-child]:top-6">
        <DialogTitle className="text-base font-semibold text-foreground">
          Why is this important?
        </DialogTitle>

        <p className="mt-4 text-[13px] text-muted-foreground">
          This account is held in Great Britain. In some cases, the sender&apos;s bank may
          automatically convert the payment into GBP before it is sent.
        </p>

        <p className="mt-4 text-[13px] text-muted-foreground">This can lead to:</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px] text-muted-foreground">
          <li>Unnecessary FX conversion fees</li>
          <li>Reduced payout amounts</li>
        </ul>

        <p className="mt-4 text-[13px] text-muted-foreground">
          To reduce the risk of automatic conversion, ask the sender to add the remark:
        </p>
        <p className="mt-2 text-sm font-semibold text-foreground">
          &quot;DO NOT CONVERT TO GBP&quot;
        </p>

        <p className="mt-4 text-[13px] text-muted-foreground">
          This helps ensure the funds are sent in the intended currency and that you receive the full
          expected amount.
        </p>

        <div className="mt-6 flex justify-end">
          <Button variant="primary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AccountCurrencyNotice({
  currency,
  className,
}: {
  currency: string;
  className?: string;
}) {
  const [guideOpen, setGuideOpen] = useState(false);
  const kind = noticeKindFor(currency);

  if (!kind) return null;

  return (
    <>
      {/* Amber, not red: the payment still works, the client just has to be
          briefed. Same tinted-surface treatment the amber icon badges use
          elsewhere, and items-start so the icon sits on the first line of a
          message that wraps to two or three. */}
      <div
        className={`flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 ${className ?? ""}`}
      >
        <Icon name="alert-triangle" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-[13px] text-muted-foreground">
          {kind === "aud" ? (
            <>
              Under new security measures, Australian banks may ask clients to verify account details
              and display precautionary warnings.{" "}
            </>
          ) : (
            <>
              Ask senders to add{" "}
              <span className="font-medium text-foreground">
                &quot;DO NOT CONVERT TO GBP&quot;
              </span>{" "}
              as a remark to avoid unexpected FX charges.{" "}
            </>
          )}
          {/* A real Button rather than styled text: it opens a dialog, so it
              has to be reachable and announced as a control. size="sm" with the
              padding stripped keeps it on the sentence's own baseline instead of
              standing off it as a separate action. */}
          <Button
            variant="ghost"
            size="sm"
            className="h-auto min-h-0 p-0 align-baseline text-[13px] font-medium text-primary hover:bg-transparent hover:underline"
            onClick={() => setGuideOpen(true)}
          >
            {kind === "aud" ? "Guide your clients" : "Why is this important?"}
          </Button>
        </p>
      </div>

      {kind === "aud" ? (
        <AudGuideDialog open={guideOpen} onOpenChange={setGuideOpen} />
      ) : (
        <GlobalGuideDialog open={guideOpen} onOpenChange={setGuideOpen} />
      )}
    </>
  );
}
