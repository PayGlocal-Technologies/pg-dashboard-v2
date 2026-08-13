"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  Drawer,
  DrawerContent,
  useBreakpoint,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import { UploadInvoiceForm } from "@/features/dashboard/mca-transactions/components/UploadInvoiceForm";
import type { McaTransaction } from "@/features/dashboard/mca-transactions/types";

interface UploadInvoiceModalProps {
  row: McaTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded?: (row: McaTransaction) => void;
}

export function UploadInvoiceModal({ row, open, onOpenChange, onUploaded }: UploadInvoiceModalProps) {
  const { isMobile } = useBreakpoint();

  const body = row ? (
    <UploadInvoiceFormBody row={row} onOpenChange={onOpenChange} onUploaded={onUploaded} />
  ) : null;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} side="bottom">
        <DrawerContent className="flex max-h-[88vh] flex-col rounded-t-2xl p-0">{body}</DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(90vh,44rem)] w-[min(100%-1.5rem,30rem)] max-w-none flex-col",
          "gap-0 overflow-hidden rounded-2xl p-0"
        )}
      >
        {body}
      </DialogContent>
    </Dialog>
  );
}

function UploadInvoiceFormBody({
  row,
  onOpenChange,
  onUploaded,
}: {
  row: McaTransaction;
  onOpenChange: (open: boolean) => void;
  onUploaded?: (row: McaTransaction) => void;
}) {
  const counterpartyName = row.partnerMaskedCustomerFullName ?? row.partnerCustomerFullName ?? "—";
  const amount = parseFloat(row.amount ?? "0");
  const currency = row.currency ?? "USD";

  return (
    <>
      <div className="shrink-0 border-b border-border px-6 pt-5 pb-4">
        <DialogTitle>Upload invoice</DialogTitle>
        <p className="mt-1 truncate text-[12px] leading-snug text-muted-foreground">
          {counterpartyName} · {formatCurrency(amount, currency, "en-US")} {currency} · {row.gid}
        </p>
      </div>

      <UploadInvoiceForm
        row={row}
        variant="modal"
        onCancel={() => onOpenChange(false)}
        onSuccess={() => {
          onUploaded?.(row);
          onOpenChange(false);
        }}
      />
    </>
  );
}
