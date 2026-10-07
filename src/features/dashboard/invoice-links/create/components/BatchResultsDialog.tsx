"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Dialog, DialogContent, DialogTitle, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icon";
import type {
  InvoiceBulkResult,
  InvoiceRecipient,
} from "@/features/dashboard/invoice-links/create/types";

/**
 * The outcome of a multi-client create, one row per client.
 *
 * The batch is partial-failure tolerant: one client failing does not stop the
 * rest, so this never reports a single pass or fail. Results come back in the
 * order the clients were sent, which is how each is matched to its client.
 */
export function BatchResultsDialog({
  open,
  results,
  recipients,
  onOpenChange,
}: {
  open: boolean;
  results: InvoiceBulkResult[];
  /** In the order they were sent. */
  recipients: InvoiceRecipient[];
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const succeeded = results.filter((r) => r.success).length;
  const failed = results.length - succeeded;

  const copy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  const title =
    failed === 0
      ? `${succeeded} invoice link${succeeded === 1 ? "" : "s"} created`
      : succeeded === 0
        ? "No invoice links were created"
        : `${succeeded} of ${results.length} invoice links created`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-w-lg flex-col gap-0 overflow-hidden p-0">
        <div className="shrink-0 border-b border-border px-6 py-4 pr-14">
          <DialogTitle>{title}</DialogTitle>
          {failed > 0 ? (
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              The ones that failed were not created. Fix the issue and create them separately.
            </p>
          ) : null}
        </div>

        <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
          {results.map((result, index) => {
            const recipient = recipients[index];
            const link = result.data?.paymentLink;
            return (
              <li key={`${result.invoiceId}-${index}`} className="flex items-start gap-3 px-6 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-foreground">
                    {recipient?.fullName || `Client ${index + 1}`}
                  </p>
                  <p className="truncate text-[12px] text-muted-foreground">{result.invoiceId}</p>
                  {!result.success && result.errorMessage ? (
                    <p className="mt-0.5 text-[12px] text-destructive">{result.errorMessage}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge
                    size="sm"
                    variant={result.success ? "success" : "danger"}
                    label={result.success ? "Created" : "Failed"}
                  />
                  {link ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Copy link for ${recipient?.fullName || result.invoiceId}`}
                      className="h-7 w-7 p-0"
                      onClick={() => void copy(link)}
                    >
                      <Icon name="copy" className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex shrink-0 justify-end border-t border-border px-6 py-4">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => router.push("/invoice-links")}
          >
            View all Invoice Links
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
