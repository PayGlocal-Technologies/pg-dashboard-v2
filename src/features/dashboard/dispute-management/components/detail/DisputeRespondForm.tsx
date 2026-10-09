"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Callout,
  CalloutIcon,
  CalloutText,
  CalloutTitle,
  Card,
  Field,
  FieldLabel,
  Separator,
  SingleSelect,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn, formatCurrency } from "@/lib/utils";
import { usePost, usePut } from "@/lib/api/hooks";
import {
  cbDocUpdateApi,
  cbRemoveProofDocApi,
} from "@/features/dashboard/dispute-management/services";
import {
  UPLOAD_ACCEPT,
  UPLOAD_MAX_MB,
} from "@/features/dashboard/dispute-management/constants";
import {
  apiErrorMessage,
  requiredDocs,
  uniqueFileName,
} from "@/features/dashboard/dispute-management/helpers";
import {
  disambiguateCaptureName,
  useCbDocumentUpload,
  useCbDocuments,
  useCbStaticData,
} from "@/features/dashboard/dispute-management/hooks";

/** The picker's accepted extensions, for dropped files (antd's Dragger enforced `accept`). */
const ACCEPTED_EXTENSIONS = UPLOAD_ACCEPT.split(",").map((ext) => ext.trim().toLowerCase());
import {
  DisputeFormTimelineCard,
  type DisputeFormStep,
} from "@/features/dashboard/dispute-management/components/detail/DisputeFormTimelineCard";
import type { DisputeRespondMode } from "@/features/dashboard/dispute-management/useDisputeResolutionFlow";
import type { DisputeCase } from "@/features/dashboard/dispute-management/types";

interface DisputeRespondFormProps {
  mode: DisputeRespondMode;
  dispute: DisputeCase;
  onBack: () => void;
  /** The amount a partial accept will return to the customer on Submit, while not yet sent. */
  pendingAcceptedAmount: string | null;
  /** Sends the pending contest / partial accept (if any), then the evidence. */
  onSubmit: () => void;
  isSubmitting: boolean;
}

/**
 * The evidence screen, for Contest, the contested part of a partial accept,
 * and a request for more documents. pg-dashboard's CbUploadDocs +
 * CbUploadDocsDrawer, in the design's layout:
 *
 * - Each file is uploaded as it is picked, under a Document Type (required,
 *   defaulting to the first one the case needs), through the presigned S3
 *   pipeline; PDF, JPG, PNG, TXT, DOCX or ZIP under 10MB. A name already
 *   present gets a " (n)" suffix. Removing a file deletes it on the server.
 * - The documents a case needs come from the API: its recommendation when
 *   there is one (which is also the only time the Smart Dispute Insight
 *   shows), else the reason code's list from the static data.
 * - Submit documents sends the uploaded evidence for review, once at least
 *   one document is on the case.
 *
 * Documents come first: for Contest and a partial accept, nothing has been
 * sent to the backend when this opens (the partial amount was asked in the
 * accept dialog). The merchant uploads, and Submit sends the contest or the
 * partial accept, then the evidence. A case already in Upload documents or
 * Insufficient documents only submits the evidence.
 */
export function DisputeRespondForm({
  mode,
  dispute,
  onBack,
  pendingAcceptedAmount,
  onSubmit,
  isSubmitting,
}: DisputeRespondFormProps) {
  const staticData = useCbStaticData();
  const documents = useCbDocuments(dispute.cbId);
  const uploader = useCbDocumentUpload(dispute.cbId, documents.refetchProof);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const docOptions = requiredDocs(dispute, staticData);
  const [docIndex, setDocIndex] = useState("0");
  const selectedDoc = docOptions[Number(docIndex)] ?? docOptions[0];

  // FileCard's isCbDelete: PUT `/doc/update` with `action: "DELETE"`, the
  // path pg-dashboard's upload drawer removes a file (or a failed attempt) by.
  const remove = usePut<unknown, { reqBody: object }>(cbDocUpdateApi(dispute.cbId), {
    onSuccess: documents.refetchProof,
    onError: (e) => toast.error(apiErrorMessage(e, "Failed to delete document")),
  });
  const deleteFile = (fileId: string) =>
    remove.mutate({
      reqBody: { cbDocRequest: { fileId, action: "DELETE", cbDocType: "PROOF_DOCS" } },
    });
  // CbUploadDocs' bin on a listed document: POST `/doc/delete/proof`, in
  // Upload documents and Insufficient documents.
  const removeListed = usePost<unknown, { fileNames: string[] }>(
    cbRemoveProofDocApi(dispute.cbId),
    {
      onSuccess: () => {
        toast.success("File removed successfully.");
        documents.refetchProof();
      },
      onError: (e) => toast.error(apiErrorMessage(e, "Failed to remove file.")),
    }
  );
  // Before the response (docs first, a state pg-dashboard never uploads in)
  // only the drawer's path applies.
  const removeListedDoc = (fileId: string) =>
    dispute.status === "UPLOAD_DOC" || dispute.status === "INSUFFICIENT_DOC"
      ? removeListed.mutate({ fileNames: [fileId] })
      : deleteFile(fileId);

  // Before the response (Action required) as well as after it (Upload
  // documents, Insufficient documents).
  // Never at arbitration (CbUploadDocs: no upload or submit there).
  const canUpload =
    dispute.level !== "ARBITRATION" &&
    (dispute.status === "ACTION_REQUIRED" ||
      dispute.status === "UPLOAD_DOC" ||
      dispute.status === "INSUFFICIENT_DOC");
  const uploaded = documents.proof;
  const hasDocuments = uploaded.length > 0;
  const canSubmit = canUpload && hasDocuments && !uploader.isUploading;
  const submitBlocked = !canUpload
    ? "This dispute isn't taking evidence right now"
    : uploader.isUploading
      ? "Wait for your uploads to finish"
      : !hasDocuments
        ? "Upload at least one document to submit"
        : undefined;

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    if (!selectedDoc) {
      toast.error("Please select the Document Type");
      return;
    }
    const names = [
      ...uploaded.map((doc) => doc.originalFileName || doc.fileName || ""),
      ...uploader.rows.map((row) => row.fileName),
    ];
    for (const file of Array.from(fileList)) {
      const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
      if (!ACCEPTED_EXTENSIONS.includes(extension)) {
        toast.error("File type not supported. Upload a PDF, JPG, PNG, TXT, DOCX or ZIP.");
        continue;
      }
      if (file.size / 1024 / 1024 >= UPLOAD_MAX_MB) {
        toast.error(`File must be smaller than ${UPLOAD_MAX_MB}MB`);
        continue;
      }
      // getUniqueFileName, then useS3FileUpload's capture-name stamp.
      const fileName = disambiguateCaptureName(uniqueFileName(file.name, names));
      names.push(fileName);
      const renamed =
        fileName !== file.name ? new File([file], fileName, { type: file.type }) : file;
      void uploader
        .upload(renamed, {
          fileName,
          docType: selectedDoc.docType,
          shortDesc: selectedDoc.shortDesc,
        })
        .then((ok) => {
          if (ok) toast.success("Document uploaded successfully.");
        });
    }
  }

  const labelFor = (docType: string | null, shortDesc: string | null | undefined) =>
    shortDesc || staticData?.cbDocInfo?.[docType ?? ""]?.shortDesc || docType || null;

  const timelineSteps: DisputeFormStep[] = [
    ...(mode === "partial"
      ? [
          {
            label: "Partial amount chosen",
            description: "The accepted amount is returned to the customer once you submit.",
            state: "complete" as const,
          },
        ]
      : []),
    {
      label:
        dispute.status === "INSUFFICIENT_DOC"
          ? "Upload additional evidence"
          : "Upload required evidence",
      description: "Add evidence like receipts, delivery proof or authorization records.",
      state: !canUpload ? "locked" : hasDocuments ? "complete" : "current",
    },
    {
      label: "Submit evidence for review",
      description:
        dispute.status !== "ACTION_REQUIRED"
          ? "Send your evidence to PayGlocal for review."
          : mode === "partial"
            ? "Accept the partial amount and send your evidence to PayGlocal for review."
            : "Contest the dispute and send your evidence to PayGlocal for review.",
      state: canSubmit ? "current" : "locked",
    },
  ];

  const title =
    mode === "partial"
      ? "Accept partially"
      : dispute.status === "INSUFFICIENT_DOC"
        ? "Submit additional supporting evidence"
        : dispute.screenStage === "PRE_ARBITRATION"
          ? "Submit additional evidence"
          : "Contest dispute";

  const submitButton = (
    <Button
      type="button"
      variant="primary"
      size="sm"
      disabled={!canSubmit}
      isLoading={isSubmitting}
      onClick={onSubmit}
    >
      Submit documents
    </Button>
  );

  return (
    <div className="page-enter space-y-4">
      <Button
        type="button"
        variant="link"
        leftIcon={<Icon name="chevron-left" size={14} />}
        onClick={onBack}
        className="h-auto w-fit gap-1 p-0 text-sm font-medium"
      >
        Back to dispute details
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "partial"
              ? "Refund part of the disputed amount and contest the rest with supporting evidence."
              : dispute.screenStage === "PRE_ARBITRATION"
                ? "Submit additional evidence for the bank to review before arbitration."
                : "Provide supporting evidence to contest this dispute."}
          </p>
        </div>
        {/* A disabled button says why (it swallows hover, so the tooltip hangs off a wrapper). */}
        {submitBlocked ? (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="inline-flex">
                  {submitButton}
                </span>
              </TooltipTrigger>
              <TooltipContent>{submitBlocked}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          submitButton
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="flex flex-col gap-5">
          {/* The partial amount chosen in the accept dialog, accepted on Submit. */}
          {mode === "partial" && (
            <Card className="shadow-none gap-1 p-5">
              <p className="text-sm font-semibold text-foreground">
                {pendingAcceptedAmount ? "Accepting partially" : "Partially accepted"}
              </p>
              <p className="text-sm text-muted-foreground">
                {pendingAcceptedAmount ? (
                  <>
                    On submit,{" "}
                    <span className="font-medium text-foreground">
                      {formatCurrency(Number(pendingAcceptedAmount), dispute.currency)}
                    </span>{" "}
                    is returned to the customer and settled from your account. You&apos;re
                    contesting the remaining{" "}
                    <span className="font-medium text-foreground">
                      {formatCurrency(
                        Math.max(dispute.amount - Number(pendingAcceptedAmount), 0),
                        dispute.currency
                      )}
                    </span>
                    .
                  </>
                ) : dispute.levelAcceptedAmount ? (
                  <>
                    You accepted{" "}
                    <span className="font-medium text-foreground">
                      {formatCurrency(dispute.levelAcceptedAmount, dispute.currency)}
                    </span>
                    , which is returned to the customer. You&apos;re contesting the remaining{" "}
                    <span className="font-medium text-foreground">
                      {formatCurrency(dispute.levelContestedAmount ?? 0, dispute.currency)}
                    </span>
                    .
                  </>
                ) : (
                  "The accepted amount is returned to the customer. Upload evidence for the amount you're contesting."
                )}
              </p>
            </Card>
          )}

          <Card className={cn("shadow-none gap-0 p-5", !canUpload && "opacity-60")}>
            <h2 className="text-lg font-bold text-foreground">Submit Supporting Evidence</h2>
            <Separator className="my-3" />
            {dispute.status === "INSUFFICIENT_DOC" ? (
              <Callout variant="warning">
                <CalloutIcon variant="warning" />
                <CalloutText className="mt-0">
                  We need more information to investigate this dispute. Please upload additional
                  documents to submit more supporting evidence. Check comments for more details.
                </CalloutText>
              </Callout>
            ) : (
              <p className="text-sm text-muted-foreground">
                You&apos;ve chosen to {mode === "partial" ? "partially accept" : "contest"} this
                dispute. Upload the required supporting documents before the response deadline.
              </p>
            )}

            {/* Only with the API's own recommendation, as pg-dashboard's CbSmartInsightBanner. */}
            {dispute.docRecommendation.length > 0 && (
              <div className="mt-4 animate-gradient-border rounded-xl bg-linear-to-r from-purple-300 via-indigo-300 to-purple-300 p-[1.5px] dark:from-purple-700/50 dark:via-indigo-700/50 dark:to-purple-700/50">
                <Callout
                  variant="discovery"
                  className="rounded-[11px] border-0 bg-linear-to-br from-purple-50 via-indigo-50 to-purple-100 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-purple-900/40"
                >
                  <CalloutIcon variant="discovery" />
                  <div>
                    <CalloutTitle>Smart Dispute Insight</CalloutTitle>
                    <CalloutText>
                      Based on similar cases, merchants who uploaded the following supporting
                      documents for this reason code won disputes more often.
                    </CalloutText>
                  </div>
                </Callout>
              </div>
            )}

            {docOptions.length > 0 && (
              <>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {dispute.docRecommendation.length > 0
                    ? "Recommended documents"
                    : "Submit all relevant documents to help strengthen your case"}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-[13px] text-foreground/85">
                  {docOptions.map((doc, index) => (
                    <span key={`${doc.docType}-${index}`} className="inline-flex items-center gap-1.5">
                      {index > 0 && (
                        <span className="text-muted-foreground" aria-hidden="true">
                          ·
                        </span>
                      )}
                      <span className="font-medium">{doc.shortDesc}</span>
                      {doc.desc && (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Icon
                                name="info"
                                size={11}
                                className="shrink-0 cursor-default text-muted-foreground"
                              />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-55 text-xs">{doc.desc}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </span>
                  ))}
                </div>
              </>
            )}

            {/*
              OUT OF SCOPE - the "AI estimate: N% chance of winning" callout and
              its "Scanning your uploaded documents" state. The score was made up
              (10 + 20 per file) and pg-dashboard shows merchants no AI on a
              dispute; the AI insights there are internal only. Dropped with the
              rest of the design's v2-only extras (G1).
            */}

            <Field className="mt-4">
              <FieldLabel>
                Document Type <span className="text-destructive">*</span>
              </FieldLabel>
              <SingleSelect
                options={docOptions.map((doc, index) => ({
                  label: doc.shortDesc,
                  value: String(index),
                }))}
                value={selectedDoc ? docIndex : ""}
                onChange={setDocIndex}
                placeholder="Select the Document Type"
                disabled={!canUpload}
              />
            </Field>

            {/* Bare <input type="file">: flux-ui has no file picker. It is
                hidden and only opened by the dropzone below, the same
                pattern as mca-transactions' InvoiceDropzone. */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={UPLOAD_ACCEPT}
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />

            {(uploaded.length > 0 || uploader.rows.length > 0) && (
              <ul className="mt-4 flex flex-col gap-1.5">
                {uploader.rows.map((row) => (
                  <li
                    key={row.fileName}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-[13px] text-foreground/85">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Icon
                          name={row.status === "error" ? "alert-circle" : "loader"}
                          size={14}
                          aria-hidden
                          className={row.status === "active" ? "animate-spin" : undefined}
                        />
                      </span>
                      <span className="truncate">{row.fileName}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <span
                        className={cn(
                          "text-xs",
                          row.status === "error" ? "text-destructive" : "text-muted-foreground"
                        )}
                      >
                        {row.message}
                      </span>
                      {row.status === "error" && (
                        <Button
                          type="button"
                          variant="ghost"
                          // A failed attempt that reached the server is deleted there too (FileCard).
                          onClick={() => {
                            if (row.fileId) deleteFile(row.fileId);
                            uploader.dismissRow(row.fileName);
                          }}
                          aria-label={`Dismiss ${row.fileName}`}
                          className="h-6 w-6 min-h-0 min-w-0 rounded-md p-0 text-muted-foreground"
                        >
                          <Icon name="x" size={12} />
                        </Button>
                      )}
                    </span>
                  </li>
                ))}
                {uploaded.map((doc, i) => {
                  const name = doc.originalFileName || doc.fileName || "Document";
                  const label = labelFor(doc.docType, doc.shortDesc);
                  return (
                    <li
                      key={doc.fileId ?? `${name}-${i}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          doc.url
                            ? window.open(doc.url, "_blank", "noopener,noreferrer")
                            : toast.error("Document is not available.")
                        }
                        aria-label={`${name}, open in a new tab`}
                        className="h-auto min-h-0 min-w-0 justify-start gap-2 p-0 text-left font-normal hover:bg-transparent"
                      >
                        <span className="flex min-w-0 items-center gap-2 text-[13px] text-foreground/85">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                            <Icon name="file-text" size={14} aria-hidden />
                          </span>
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate hover:underline">{name}</span>
                            {label && (
                              <span className="text-[11px] text-muted-foreground">{label}</span>
                            )}
                          </span>
                        </span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={!canUpload || remove.isPending || removeListed.isPending}
                        onClick={() => doc.fileId && removeListedDoc(doc.fileId)}
                        aria-label={`Remove ${name}`}
                        className="h-6 w-6 min-h-0 min-w-0 shrink-0 rounded-md p-0 text-muted-foreground"
                      >
                        <Icon name="x" size={12} />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}

            <Button
              type="button"
              variant="ghost"
              disabled={!canUpload || !selectedDoc}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (canUpload && selectedDoc) addFiles(e.dataTransfer.files);
              }}
              className="mt-4 h-auto min-h-30 w-full rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-6 text-center hover:bg-primary/10"
            >
              <span className="flex flex-col items-center justify-center gap-2">
                <Icon name="upload" size={22} className="text-primary" aria-hidden />
                <span className="text-sm font-semibold text-primary">
                  {hasDocuments ? "Upload additional documents" : "Upload documents"}
                </span>
                <span className="text-xs text-muted-foreground">
                  PDF, JPG, PNG, TXT, DOCX or ZIP, up to {UPLOAD_MAX_MB}MB
                  {selectedDoc ? `, as ${selectedDoc.shortDesc}` : ""}
                </span>
              </span>
            </Button>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Note: Try to upload as many documents as possible to win this dispute.
            </p>
          </Card>
        </div>

        <div className="lg:sticky lg:top-4">
          <DisputeFormTimelineCard steps={timelineSteps} />
        </div>
      </div>
    </div>
  );
}
