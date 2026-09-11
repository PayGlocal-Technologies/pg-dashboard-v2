"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_TOTAL_BYTES,
} from "@/features/dashboard/support-tickets/constants";

export interface PickedFile {
  /** Stable across re-renders and removals, so React keys never reuse a slot.
   *  A list index would; two files can share a name, so that will not do
   *  either. */
  id: number;
  file: File;
}

export interface TicketAttachmentsState {
  picked: PickedFile[];
  files: File[];
  totalBytes: number;
  addFiles: (files: File[]) => void;
  removeFile: (id: number) => void;
  clear: () => void;
}

/**
 * The attachment list for a create or a reply.
 *
 * Files are held locally and sent with the request, unlike the transaction
 * query composer, which uploads each file the moment it is picked. That is not
 * a style choice: this API takes its attachments in the same multipart request
 * as the ticket, so there is nothing to upload them to ahead of time.
 *
 * The 20MB cap is Freshdesk's and applies to the request as a whole, so it is
 * enforced as a running total over everything picked rather than per file.
 */
export function useTicketAttachments(): TicketAttachmentsState {
  const [picked, setPicked] = useState<PickedFile[]>([]);
  // A ref, not state: bumping a counter must not itself trigger a render, and
  // it is only ever touched from an event handler.
  const nextId = useRef(0);

  const addFiles = useCallback((incoming: File[]) => {
    if (incoming.length === 0) return;

    setPicked((current) => {
      const slots = MAX_ATTACHMENTS - current.length;
      if (slots <= 0) {
        toast.error(`You can attach up to ${MAX_ATTACHMENTS} files.`);
        return current;
      }
      if (incoming.length > slots) {
        toast.error(`You can attach up to ${MAX_ATTACHMENTS} files.`);
      }

      let runningTotal = current.reduce((sum, entry) => sum + entry.file.size, 0);
      const accepted: PickedFile[] = [];
      let rejectedForSize = false;

      for (const file of incoming.slice(0, slots)) {
        if (runningTotal + file.size > MAX_ATTACHMENT_TOTAL_BYTES) {
          rejectedForSize = true;
          continue;
        }
        runningTotal += file.size;
        accepted.push({ id: nextId.current++, file });
      }

      if (rejectedForSize) {
        toast.error("Attachments must total 20MB or less.");
      }

      return accepted.length > 0 ? [...current, ...accepted] : current;
    });
  }, []);

  const removeFile = useCallback((id: number) => {
    setPicked((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const clear = useCallback(() => setPicked([]), []);

  return {
    picked,
    files: picked.map((entry) => entry.file),
    totalBytes: picked.reduce((sum, entry) => sum + entry.file.size, 0),
    addFiles,
    removeFile,
    clear,
  };
}
