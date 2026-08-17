"use client";

import type { ReactNode } from "react";
import { Button, Dialog, DialogContent, DialogTitle, Separator } from "@/components/ui";

/**
 * What the rail behind an account actually is, and how fast it settles.
 *
 * Ported from pg-dashboard's PaymentMethodInfoModal, which keys its content off
 * the payment-method string itself — the same values `PRESENTATION_BY_CURRENCY`
 * carries in mapAccounts.ts, since both come from production's
 * CURRENCY_PAYMENT_METHOD_MAP. A method with no entry renders nothing rather
 * than an empty dialog, so the trigger is hidden in that case too.
 */

/** One "ACH — 2-5 business days — equivalent to NEFT" row. */
function TimingRow({ rail, timing, note }: { rail: string; timing: string; note?: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
      <p className="w-20 shrink-0 text-sm font-semibold text-foreground">{rail}</p>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{timing}</p>
        {note && <p className="text-[13px] text-muted-foreground">{note}</p>}
      </div>
    </div>
  );
}

function Body({ children }: { children: ReactNode }) {
  return <p className="text-[13px] leading-relaxed text-muted-foreground">{children}</p>;
}

function TimelineHeading({ children }: { children: ReactNode }) {
  return <p className="mt-6 text-sm font-semibold text-foreground">{children}</p>;
}

interface MethodInfo {
  title: string;
  content: ReactNode;
}

const METHOD_INFO: Record<string, MethodInfo> = {
  "ACH/Fedwire": {
    title: "What are ACH / Fedwire transfers?",
    content: (
      <>
        <Body>
          ACH and Fedwire are two secure electronic payment methods in the US for local bank
          transfers. Your customer will add your US bank details as a beneficiary to send funds
          domestically.
        </Body>
        <div className="mt-6 space-y-4">
          <TimingRow
            rail="ACH"
            timing="2-5 business days"
            note="Payment method equivalent to NEFT in India"
          />
          <TimingRow
            rail="Fedwire"
            timing="1 business day"
            note="Payment method equivalent to RTGS in India"
          />
        </div>
      </>
    ),
  },

  "FPS/CHAPS/BECS": {
    title: "What is FPS?",
    content: (
      <>
        <Body>
          FPS (Faster Payments Service) is a secure electronic payment method for bank-to-bank
          transfers in the UK.
        </Body>
        <Body>
          To make payments, your client needs to add your UK bank account details as a beneficiary in
          their banking portal.
        </Body>
        <TimelineHeading>Transfer timeline</TimelineHeading>
        <Body>
          FPS invoices are processed instantly. Once a transfer is initiated, it will be settled in
          your account in minutes.
        </Body>
      </>
    ),
  },

  "SEPA/SEPA Instant": {
    title: "What is SEPA?",
    content: (
      <>
        <Body>
          SEPA (Single Euro Payments Area) allows you to receive payments in euros (EUR) from
          customers across Europe, directly into your account.
        </Body>
        <Body>
          To make payments, your client needs to add your local bank account details as a beneficiary
          in their banking portal.
        </Body>
        <TimelineHeading>Transfer timeline</TimelineHeading>
        <Body>
          Once a SEPA transfer is initiated, funds will be settled in your PayGlocal account in 1-2
          business days.
        </Body>
      </>
    ),
  },

  EFT: {
    title: "What is EFT?",
    content: (
      <>
        <Body>
          EFT (Electronic Funds Transfer) is a secure electronic payment method for bank-to-bank
          transfers in Canada.
        </Body>
        <Body>
          To make payments, your client needs to add your Canadian bank account details as a
          beneficiary in their banking portal.
        </Body>
        <TimelineHeading>Transfer timeline</TimelineHeading>
        <Body>
          Once an EFT payment is initiated by your client, the funds will be settled in your
          PayGlocal account in 1-3 business days.
        </Body>
      </>
    ),
  },

  // Australia's entry covers two rails, so it is the one dialog with two
  // sections — production splits it the same way.
  "BECS/NPP/Osko": {
    title: "What is BECS?",
    content: (
      <>
        <Body>
          BECS (Bulk Electronic Clearing System) is a secure electronic payment method for
          bank-to-bank transfers in Australia.
        </Body>
        <Body>
          To make payments, your client needs to add your Australian bank account details as a
          beneficiary in their banking portal.
        </Body>
        <TimelineHeading>Transfer timeline</TimelineHeading>
        <Body>
          Once a BECS payment is initiated by your client, the funds will be settled in your
          PayGlocal account in 1-3 business days.
        </Body>

        <Separator className="my-6 border-dashed" />

        <p className="text-base font-semibold text-foreground">What is NPP/Osko?</p>
        <div className="mt-3 space-y-3">
          <Body>
            NPP (New Payments Platform) is a real-time payment system in Australia for bank-to-bank
            transfers.
          </Body>
          <Body>
            Osko is a payment overlay built on NPP that enables near-instant, 24/7 bank transfers. It
            is widely used by major Australian banks.
          </Body>
          <Body>
            To make payments, your client needs to add your Australian bank account details as a
            beneficiary in their banking portal.
          </Body>
        </div>
        <TimelineHeading>Transfer timeline</TimelineHeading>
        <Body>
          NPP invoices are processed instantly. Once a transfer is initiated, it will be settled in
          your account in minutes.
        </Body>
      </>
    ),
  },
};

/** Whether there is anything to show for a method — the trigger uses this so it
 *  never opens an empty dialog. */
export function hasPaymentMethodInfo(paymentMethod: string): boolean {
  return !!METHOD_INFO[paymentMethod];
}

export function PaymentMethodInfoDialog({
  paymentMethod,
  open,
  onOpenChange,
}: {
  paymentMethod: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const info = METHOD_INFO[paymentMethod];
  if (!info) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(80vh,720px)] max-w-[min(100%,36rem)] overflow-y-auto p-6 [&>button:last-child]:top-6">
        <DialogTitle className="text-base font-semibold text-foreground">{info.title}</DialogTitle>

        <Separator className="my-4 border-dashed" />

        <div className="space-y-3">{info.content}</div>

        <div className="mt-6 flex justify-end">
          <Button variant="primary" onClick={() => onOpenChange(false)}>
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
