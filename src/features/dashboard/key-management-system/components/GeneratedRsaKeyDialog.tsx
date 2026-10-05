"use client";

import { toast } from "sonner";
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { downloadBlob } from "@/lib/utils/format";
import type { KeyFile } from "@/features/dashboard/key-management-system/types";

/**
 * A new RSA private key, offered once: pg-dashboard's KeyIdDrawer. Download
 * saves it and closes, as there. An outside click doesn't close it: the key
 * can never be downloaded again.
 */
export function GeneratedRsaKeyDialog({
  file,
  onClose,
}: {
  file: KeyFile | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {file && (
          <>
            <div className="shrink-0 border-b border-border px-6 py-4 pr-14">
              <DialogTitle>RSA key generated</DialogTitle>
              <DialogDescription>
                Your integration signs requests with this private key.
              </DialogDescription>
            </div>
            <div className="px-6 py-5">
              <Alert variant="warning">
                <AlertDescription>
                  This is the only time you can download this private key. Download it now and store
                  it somewhere secure.
                </AlertDescription>
              </Alert>
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button
                type="button"
                leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
                onClick={() => {
                  downloadBlob(file.blob, file.fileName);
                  toast.success("Downloaded successfully");
                  onClose();
                }}
              >
                Download private key
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
