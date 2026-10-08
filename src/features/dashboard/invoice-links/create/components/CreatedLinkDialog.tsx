"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Card, Dialog, DialogContent, DialogTitle } from "@/components/ui";
import { SuccessTick } from "@/components/common/SuccessTick";

/**
 * Post-create confirmation.
 *
 * Upstream's CreatedLinkDrawer: a tick, the copyable link, "Copy Invoice Link"
 * and "View all Invoice Links". Copy text is upstream's verbatim. Closing it
 * leaves the merchant in the editor; "View all Invoice Links" is the one way
 * to the list (upstream's close navigated back instead).
 */
export function CreatedLinkDialog({
  open,
  link,
  isShared,
  onOpenChange,
}: {
  open: boolean;
  link: string;
  /** The merchant's invoice config has customer sharing on (`invoiceCustomerSharing`). */
  isShared: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <div className="text-center">
          <SuccessTick className="mx-auto h-14 w-14" />
          {/* gcc-ui-temp's two titles: "shared" only when the merchant's invoice
              config has customer sharing on, since only then is the link
              actually sent to the customer. */}
          <DialogTitle className="mt-2 text-base">
            {isShared
              ? "Invoice Link is created and successfully shared!"
              : "Invoice Link is created!"}
          </DialogTitle>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Use the link below to receive payment from your customers
          </p>
        </div>

        {link ? (
          <Card className="mt-4 break-all px-3 py-2.5 text-[12.5px] text-primary">{link}</Card>
        ) : null}

        <div className="mt-5 flex flex-col gap-2">
          <Button type="button" variant="primary" disabled={!link} onClick={() => void copy()}>
            Copy Invoice Link
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push("/invoice-links")}>
            View all Invoice Links
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
