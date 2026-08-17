"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useGet, usePut } from "@/lib/api/hooks";
import type {
  AttachmentPresignResponse,
  ConversationSendPayload,
  FrmAttachment,
  PendingAttachment,
  PresignedUrlResponse,
} from "@/features/dashboard/mca-transactions/types";

// Shared machinery for the two transaction-query threads (compliance and
// additional documents). Both talk to the same three shapes of endpoint —
// upload an attachment, download an attachment, append a message — differing
// only in the URLs, so they run on one hook rather than two near-identical
// copies of this logic (which is what pg-dashboard has).

/** Content types the presigned PUT is signed against. Anything outside this
 *  list falls back to a generic binary type rather than being rejected. */
const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
  csv: "text/csv;charset=utf-8;",
};

const FALLBACK_CONTENT_TYPE = "application/octet-stream";

export const ATTACHMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png";
export const MAX_ATTACHMENTS = 10;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function extensionOf(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export interface UseQueryThreadArgs {
  /** Base URL for attachment upload (PUT) and download (GET). */
  fileApi: string;
  /** URL the composed message is PUT to. */
  sendApi: string;
  /** Refetches the thread after a message is appended. */
  onSent: () => void;
}

export interface UseQueryThreadResult {
  comment: string;
  setComment: (value: string) => void;
  attachments: PendingAttachment[];
  addFiles: (files: File[]) => void;
  removeAttachment: (fileUUID: string) => void;
  downloadAttachment: (fileUUID: string) => void;
  send: () => Promise<void>;
  isSending: boolean;
  canSend: boolean;
}

export function useQueryThread({
  fileApi,
  sendApi,
  onSent,
}: UseQueryThreadArgs): UseQueryThreadResult {
  const [comment, setComment] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [downloadTarget, setDownloadTarget] = useState<{ fileUUID: string; nonce: number } | null>(
    null
  );

  const { mutateAsync: presignAttachment } = usePut<
    AttachmentPresignResponse,
    { dynamicUrl: string; reqBody: Record<string, never> }
  >(fileApi, { invalidateQueries: false });

  const { mutateAsync: uploadToS3 } = usePut<
    unknown,
    { dynamicUrl: string; customHeaders: Record<string, string>; reqBody: File }
  >("", { invalidateQueries: false });

  const { mutateAsync: sendMessage } = usePut<unknown, { reqBody: ConversationSendPayload }>(
    sendApi,
    { invalidateQueries: false }
  );

  // Downloading is a GET for a short-lived presigned URL, so it is a disabled
  // query plus an explicit trigger rather than a mutation. The nonce makes
  // every request a distinct key, so asking for the same file twice refetches
  // instead of replaying a by-then expired URL. The fetch and the window.open
  // both happen inside the async callback below, never in the effect body.
  const { refetch: fetchDownloadUrl } = useGet<PresignedUrlResponse>(
    ["mca-query-attachment", fileApi, downloadTarget?.fileUUID, downloadTarget?.nonce],
    downloadTarget ? `${fileApi}?docUUID=${downloadTarget.fileUUID}` : "",
    { enabled: false, staleTime: 0 }
  );

  useEffect(() => {
    if (!downloadTarget) return;

    const run = async (): Promise<void> => {
      const { data, error } = await fetchDownloadUrl();
      const url = data?.data?.presignedUrl;

      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else if (error) toast.error("Couldn't open the file. Please try again.");

      setDownloadTarget(null);
    };

    void run();
  }, [downloadTarget, fetchDownloadUrl]);

  /** Uploads one file, swapping its temporary row for the server's fileUUID. */
  const uploadOne = useCallback(
    async (file: File) => {
      const tempId = crypto.randomUUID();
      setAttachments((prev) => [
        ...prev,
        { fileUUID: tempId, fileName: file.name, uploading: true },
      ]);

      try {
        const extension = extensionOf(file.name);
        const presign = await presignAttachment({
          dynamicUrl: `${fileApi}?extension=.${extension}`,
          reqBody: {},
        });

        const { fileUUID, presignedUrl, metaData } = presign.data;

        // The URL is signed against these headers, so every metadata field the
        // server returned has to go back out verbatim, lowercased and prefixed.
        const headers: Record<string, string> = {
          "Content-Type": CONTENT_TYPE_BY_EXTENSION[extension] ?? FALLBACK_CONTENT_TYPE,
        };
        Object.entries(metaData ?? {}).forEach(([key, value]) => {
          headers[`x-amz-meta-${key.toLowerCase()}`] = String(value);
        });

        await uploadToS3({ dynamicUrl: presignedUrl, customHeaders: headers, reqBody: file });

        setAttachments((prev) =>
          prev.map((a) =>
            a.fileUUID === tempId ? { fileUUID, fileName: file.name, uploading: false } : a
          )
        );
      } catch {
        setAttachments((prev) => prev.filter((a) => a.fileUUID !== tempId));
        toast.error(`Couldn't upload ${file.name}. Please try again.`);
      }
    },
    [fileApi, presignAttachment, uploadToS3]
  );

  const attachmentCount = attachments.length;
  const addFiles = useCallback(
    (files: File[]) => {
      const remainingSlots = Math.max(0, MAX_ATTACHMENTS - attachmentCount);
      if (files.length > remainingSlots) {
        toast.error(`You can attach up to ${MAX_ATTACHMENTS} files.`);
      }

      files.slice(0, remainingSlots).forEach((file) => {
        if (file.size > MAX_ATTACHMENT_BYTES) {
          toast.error(`${file.name} is larger than 10MB.`);
          return;
        }
        void uploadOne(file);
      });
    },
    [attachmentCount, uploadOne]
  );

  const removeAttachment = useCallback((fileUUID: string) => {
    setAttachments((prev) => prev.filter((a) => a.fileUUID !== fileUUID || a.uploading));
  }, []);

  const downloadAttachment = useCallback((fileUUID: string) => {
    if (fileUUID) setDownloadTarget({ fileUUID, nonce: performance.now() });
  }, []);

  const isUploading = attachments.some((a) => a.uploading);
  const canSend = comment.trim().length > 0 && !isSending && !isUploading;

  const send = useCallback(async () => {
    if (!comment.trim()) return;
    if (isUploading) {
      toast.error("Please wait for all files to finish uploading.");
      return;
    }

    setIsSending(true);
    try {
      const payload: FrmAttachment[] = attachments.map(({ fileUUID, fileName }) => ({
        fileUUID,
        fileName,
      }));
      await sendMessage({ reqBody: { message: comment.trim(), attachments: payload } });
      setComment("");
      setAttachments([]);
      onSent();
    } catch {
      toast.error("Couldn't send the message. Please try again.");
    } finally {
      setIsSending(false);
    }
  }, [comment, isUploading, attachments, sendMessage, onSent]);

  return {
    comment,
    setComment,
    attachments,
    addFiles,
    removeAttachment,
    downloadAttachment,
    send,
    isSending,
    canSend,
  };
}
