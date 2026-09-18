"use client";

import { Card, IconButton, Separator } from "@/components/ui";
import { Icon } from "@/components/icon";
import { CopyableText } from "@/components/common/CopyableText";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import { MOCK_VIRTUAL_ACCOUNTS } from "@/features/dashboard/multi-currency/mock-data";
import { buildFullAccountDetails } from "@/features/dashboard/multi-currency/utils";
import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

/**
 * The customer-facing MCA payment page, rendered inside the Create MCA Link
 * page's device preview.
 *
 * NOTE ON REUSE: there is no public MCA payment page in this codebase (and no
 * payment/checkout primitives in flux-ui) to reuse, so this is the first
 * implementation of that surface rather than a second copy of one — searched
 * for and confirmed absent before writing it. Everything it can borrow, it
 * borrows: the receiving-account data and field ordering come from
 * MOCK_VIRTUAL_ACCOUNTS/buildFullAccountDetails (the same source the Virtual
 * Accounts page renders), copy interactions come from CopyableText, and the
 * chrome is plain Flux Card/Separator/IconButton. When the real public page
 * is built it should import this component rather than restating it.
 */

/** Deterministic stand-in transaction id (no Math.random/Date.now — see
 *  CLAUDE.md's purity rules), so the same invoice always previews the same
 *  id instead of a new one on every keystroke. Replaced by the real
 *  backend-issued id once the create endpoint exists. */
function previewTxnId(seed: string): string {
  let hash = 0;
  for (const ch of seed || "mca-link") {
    hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  }
  return hash.toString(36).toUpperCase().padStart(11, "X").slice(0, 11);
}

/** Grouped amount without a symbol — the currency code sits beside it in the
 *  banner, so formatCurrency's symbol prefix would say it twice. */
function previewAmount(raw: string): string {
  const parsed = parseFloat(raw);
  if (!Number.isFinite(parsed)) return "0.00";
  return parsed.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PreviewRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      {value ? (
        <CopyableText value={value} className="min-w-0 justify-end text-right" />
      ) : (
        <span className="text-[12px] text-muted-foreground/60">—</span>
      )}
    </div>
  );
}

export interface CustomerPreviewProps {
  amount: string;
  currency: string;
  invoiceNumber: string;
  description: string;
}

export function CustomerPreview({
  amount,
  currency,
  invoiceNumber,
  description,
}: CustomerPreviewProps) {
  // The receiving account the customer is told to pay into follows the
  // currency they're being charged in, so switching currency on the left
  // swaps the bank details on the right — the same lookup the Virtual
  // Accounts page does, against the same list.
  const account: VirtualAccount | undefined =
    MOCK_VIRTUAL_ACCOUNTS.find((a) => a.currency === currency) ?? MOCK_VIRTUAL_ACCOUNTS[0];
  const fields = account ? buildFullAccountDetails(account) : [];

  return (
    <Card className="w-full gap-0 overflow-hidden p-0 shadow-lg">
      {/* Merchant / transaction header */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <Icon name="clock" className="h-5 w-5 shrink-0 text-muted-foreground" />
        <Separator orientation="vertical" className="h-8" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-foreground">
            {/* Filled in from the Customer Details section once that section
                has its fields — see CreateMcaLinkPage. */}
            <span className="text-muted-foreground">Customer name</span>
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            Txn ID: {previewTxnId(invoiceNumber)}
          </p>
        </div>
        {/* Inert: this is a preview of the customer's page, not the page
            itself, so its close affordance is shown but does nothing. */}
        <IconButton aria-label="Close" variant="ghost" size="sm" disabled>
          <Icon name="x" className="h-4 w-4" />
        </IconButton>
      </div>

      {/* Amount banner */}
      <div className="flex items-center justify-between gap-3 bg-foreground px-4 py-3.5">
        <span className="text-[14px] font-medium text-background">Total Amount</span>
        <span className="text-[15px] font-semibold tabular-nums text-background">
          {previewAmount(amount)} {currency}
        </span>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className="space-y-1">
          <h4 className="text-[14px] font-semibold text-foreground">Complete your transaction</h4>
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            Use the below bank details to initiate a bank transfer request. Please use the correct
            bank account and details.
          </p>
        </div>

        {/* What the merchant is charging for. Empty fields collapse rather
            than showing a blank row, so an untouched form previews clean. */}
        {(invoiceNumber || description) && (
          <div className="rounded-lg border border-border">
            {invoiceNumber && <PreviewRow label="Invoice No." value={invoiceNumber} />}
            {invoiceNumber && description && <Separator />}
            {description && (
              <div className="flex items-start justify-between gap-3 px-4 py-3">
                <span className="shrink-0 text-[12px] text-muted-foreground">Description</span>
                <span className="min-w-0 break-words text-right text-[12px] text-foreground">
                  {description}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Receiving Account Information */}
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex items-center justify-center gap-2 bg-muted/60 px-4 py-3">
            {/* "ROW" is the SWIFT-rail catch-all account, not a country, so
                it has no flag asset — a globe stands in, the same swap the
                Currency filter chip makes for that entry. */}
            {account &&
              (account.iso2 === "ROW" ? (
                <Icon name="globe" className="h-3.5 w-5 shrink-0 text-muted-foreground" />
              ) : (
                <CountryFlag iso2={account.iso2} alt={account.countryName} />
              ))}
            <span className="text-[13px] font-medium text-foreground">
              Receiving Account Information
            </span>
          </div>

          {fields.map((field, index) => (
            <div key={field.label}>
              {index > 0 && <Separator />}
              <PreviewRow label={field.label} value={field.value} />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
