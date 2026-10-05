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
 * navigates to the list, which is where upstream's `router.back()` lands from
 * the create route anyway, and is unambiguous from the edit route too.
 */
export function CreatedLinkDialog({
  open,
  link,
  onOpenChange,
}: {
  open: boolean;
  link: string;
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
          <DialogTitle className="mt-2 text-base">
            Invoice Link is created successfully and shared!
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
