"use client";

import { toast } from "sonner";
import {
  Button,
  COUNTRIES,
  Card,
  Dialog,
  DialogContent,
  DialogTitle,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  StatusBadge,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { PAYMENT_LINK_STATUS_META } from "@/features/dashboard/payment-links/columns";
import { PaymentLinkQrCard } from "@/features/dashboard/payment-links/components/PaymentLinkQrCard";
import type { PaymentLinkRow } from "@/features/dashboard/payment-links/types";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";

async function copyToClipboard(value: string, message: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(message);
  } catch {
    // Clipboard access denied, fail silently, matches CopyableValue's existing behavior.
  }
}

interface DetailFieldProps {
  label: string;
  value: React.ReactNode;
  span?: boolean;
  className?: string;
}

function DetailField({ label, value, span, className }: DetailFieldProps) {
  return (
    <div className={cn(span && "col-span-2", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-semibold leading-snug text-foreground">{value}</div>
    </div>
  );
}

/** The country a phone number's dial code belongs to, for its flag: the
 *  longest matching prefix wins (+1 268 is Antigua, not the US). A shared
 *  code (+1, +7) resolves to the first country listed for it, which is the
 *  largest (US, Russia). No row has a country of its own to use instead. */
function phoneIso2(phone: string): string | undefined {
  const normalized = phone.replace(/[^\d+]/g, "");
  let best: { code: string; dialCode: string } | undefined;
  for (const c of COUNTRIES) {
    const dial = c.dialCode.replace(/[^\d+]/g, "");
    if (normalized.startsWith(dial) && dial.length > (best?.dialCode.length ?? 0)) {
      best = { code: c.code, dialCode: dial };
    }
  }
  return best?.code;
}

interface PaymentLinkDetailsModalProps {
  row: PaymentLinkRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentLinkDetailsModal({ row, open, onOpenChange }: PaymentLinkDetailsModalProps) {
  if (!row) return null;

  const fullUrl = `https://${row.paymentLinkUrl}`;
  const phoneFlag = row.customerPhone ? phoneIso2(row.customerPhone) : undefined;
  const statusMeta = PAYMENT_LINK_STATUS_META[row.status];
  const showQr = row.status === "ACTIVE";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-[720px] flex-col gap-0 overflow-hidden p-0">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4 pr-14">
          {/* The link's ID sits right beside the title (pr-0 drops the
              DialogTitle's own right padding), in a light grey chip with its
              copy button. */}
          <div className="flex min-w-0 items-center gap-2">
            <DialogTitle className="shrink-0 pr-0">Payment Link Details</DialogTitle>
            <div className="flex min-w-0 items-center gap-0.5 rounded-md bg-muted py-0.5 pr-0.5 pl-2">
              <span className="truncate tabular-nums text-sm text-muted-foreground">{row.id}</span>
              <Button
                type="button"
                variant="ghost"
                onClick={() => copyToClipboard(row.id, "Payment Link ID copied")}
                className="h-6 w-6 min-h-0 min-w-0 shrink-0 rounded-md p-0 text-muted-foreground hover:bg-background"
                aria-label="Copy Payment Link ID"
              >
                <Icon name="copy" size={12} />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
          {/* Hero, amount and status are the priority, same headline
           * typography as the Settlement Details page's amount. */}
          <div>
            <p className="text-sm text-muted-foreground">
              Payment for <span className="font-semibold text-foreground">{row.paymentFor}</span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {/* Symbol and figure, then the currency code: "$1,000.00 USD". */}
              <p className="flex items-baseline gap-1.5 text-4xl font-bold tracking-tight text-foreground tabular-nums">
                {formatCurrency(row.amount, row.currency)}
                <span className="text-lg font-medium text-muted-foreground">{row.currency}</span>
              </p>
              <StatusBadge
                variant={statusMeta.variant}
                label={statusMeta.label}
                trailIcon={statusMeta.trailIcon}
                size="sm"
              />
            </div>
          </div>

          {/* 248px from sm up (with a trimmed left padding), just enough for the short link and its copy
              button (full width on a phone); the link reads as one, in the
              primary blue. */}
          <InputGroup className="sm:w-62">
            {/* text-primary!: globals.css colours every input with an
                unlayered rule, which beats any (layered) Tailwind utility
                however specific, and Flux mutes read-only text besides. */}
            <InputGroupInput
              readOnly
              value={fullUrl}
              className="pl-3 tabular-nums text-sm text-primary!"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                type="button"
                onClick={() => copyToClipboard(fullUrl, "Payment link copied")}
                aria-label="Copy payment link"
              >
                <Icon name="copy" size={13} />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>

          {/* Link Details and Customer Details, stacked full-width cards,
           * each an elongated rectangle with a 2-column grid of stacked
           * label/value pairs inside. */}
          <Card className="gap-4 p-5">
            <h3 className="text-sm font-semibold text-foreground">Link Details</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <DetailField label="Created At" value={formatDate(row.createdAt)} />
              <DetailField label="Expires At" value={formatDate(row.expiresAt)} />
              <DetailField label="Notify Via" value={row.notifyVia.join(", ")} />
              <DetailField
                label="Status"
                value={
                  <StatusBadge
                    variant={statusMeta.variant}
                    label={statusMeta.label}
                    trailIcon={statusMeta.trailIcon}
                    size="sm"
                  />
                }
              />
            </div>
          </Card>

          <Card className="gap-4 p-5">
            <h3 className="text-sm font-semibold text-foreground">Customer Details</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <DetailField label="Customer Name" value={row.customerName} />
              <DetailField
                label="Phone Number"
                value={
                  row.customerPhone ? (
                    <span className="inline-flex items-center gap-2">
                      {phoneFlag && <CountryFlag iso2={phoneFlag} alt="" />}
                      {row.customerPhone}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
              <DetailField
                label="Email Address"
                value={row.customerDetails}
                className="lowercase"
                span
              />
              <DetailField label="Billing Address" value={row.billingAddress} span />
            </div>
          </Card>

          {/* QR, only for Active links, last in the body: the link's own
           * details come first, sharing it after. */}
          {showQr && (
            <PaymentLinkQrCard
              url={fullUrl}
              onCopy={() => copyToClipboard(fullUrl, "Payment link copied")}
              className="items-center gap-3 p-4"
            />
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => copyToClipboard(fullUrl, "Payment link copied")}
          >
            Copy Payment Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
