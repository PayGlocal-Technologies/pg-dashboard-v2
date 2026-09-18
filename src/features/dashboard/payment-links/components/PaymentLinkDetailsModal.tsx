"use client";

import { toast } from "sonner";
import {
  Button,
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

interface PaymentLinkDetailsModalProps {
  row: PaymentLinkRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentLinkDetailsModal({ row, open, onOpenChange }: PaymentLinkDetailsModalProps) {
  if (!row) return null;

  const fullUrl = `https://${row.paymentLinkUrl}`;
  const statusMeta = PAYMENT_LINK_STATUS_META[row.status];
  const showQr = row.status === "ACTIVE";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-[720px] flex-col gap-0 overflow-hidden p-0">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-4 pr-14">
          <div className="min-w-0">
            <DialogTitle>Payment Link Details</DialogTitle>
            <div className="mt-1 flex items-center gap-1">
              <span className="truncate font-mono text-sm text-muted-foreground">{row.id}</span>
              <Button
                type="button"
                variant="ghost"
                onClick={() => copyToClipboard(row.id, "Payment Link ID copied")}
                className="h-6 w-6 min-h-0 min-w-0 shrink-0 rounded-md p-0 text-muted-foreground"
                aria-label="Copy Payment Link ID"
              >
                <Icon name="copy" size={12} />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
          {/* QR, only for Active links, and placed first so sharing the link
           * is the very first thing the merchant sees. */}
          {showQr && (
            <PaymentLinkQrCard
              url={fullUrl}
              onCopy={() => copyToClipboard(fullUrl, "Payment link copied")}
              className="items-center gap-3 p-4"
            />
          )}

          {/* Hero, amount and status are the priority, same headline
           * typography as the Settlement Details page's amount. */}
          <div>
            <p className="text-sm text-muted-foreground">
              Payment for <span className="font-semibold text-foreground">{row.paymentFor}</span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="flex items-baseline gap-1.5 text-4xl font-bold tracking-tight text-foreground tabular-nums">
                <span className="text-lg font-medium text-muted-foreground">{row.currency}</span>
                {row.amount.toFixed(2)}
              </p>
              <StatusBadge
                variant={statusMeta.variant}
                label={statusMeta.label}
                trailIcon={statusMeta.trailIcon}
                size="sm"
              />
            </div>
          </div>

          <InputGroup>
            <InputGroupInput readOnly value={fullUrl} className="font-mono text-xs" />
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
              <DetailField label="Phone Number" value={row.customerPhone || "—"} />
              <DetailField
                label="Email Address"
                value={row.customerDetails}
                className="lowercase"
                span
              />
              <DetailField
                label="Billing Address"
                value={row.billingAddress}
                span
                className="border-t border-border pt-4"
              />
            </div>
          </Card>
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
