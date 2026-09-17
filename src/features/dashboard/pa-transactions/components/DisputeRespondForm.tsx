"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Callout,
  CalloutIcon,
  CalloutTitle,
  CalloutText,
  Card,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Separator,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { AppImage } from "@/components/common/AppImage";
import { cn, formatCurrency } from "@/lib/utils";
import {
  DisputeFormTimelineCard,
  type DisputeFormStep,
} from "@/features/dashboard/pa-transactions/components/DisputeFormTimelineCard";
import type { SubmittedDocument } from "@/features/dashboard/pa-transactions/components/DisputeStatusNoticeCard";

interface UploadedFile {
  file: File;
  /** Object URL for an image upload, shown as a small thumbnail (see the
   * uploaded-files list below) — null for a non-image (e.g. a PDF), which
   * falls back to a plain file icon since there's nothing to preview. */
  previewUrl: string | null;
}

export type DisputeRespondMode = "partial" | "contest";
type ContestReason = "withdrawn" | "refunded" | "not-fraudulent" | "other";

interface RecommendedDocument {
  key: string;
  label: string;
  description: string;
}

/** Reference-only guidance on what to upload, never a selection the
 * merchant makes — see this component's own doc comment below. */
const RECOMMENDED_DOCUMENTS: RecommendedDocument[] = [
  {
    key: "order-details",
    label: "Order details",
    description: "Invoice or order confirmation showing the purchase details.",
  },
  {
    key: "authorization",
    label: "Copy of Online Authorization details",
    description: "Records showing the cardholder authorised this specific transaction.",
  },
  {
    key: "proof-of-delivery",
    label: "Proof of Delivery (PoD) / Services Rendered",
    description: "Shipping confirmation, delivery receipt, or proof the service was completed.",
  },
  {
    key: "refund-policy",
    label: "Refund / Cancellation Policy",
    description: "Your refund or cancellation policy the cardholder agreed to at purchase.",
  },
  {
    key: "other",
    label: "Other Documents",
    description: "Any other evidence that supports your case.",
  },
];

const REASON_OPTIONS: { value: ContestReason; label: string }[] = [
  { value: "withdrawn", label: "Cardholder withdrew the dispute" },
  { value: "refunded", label: "Cardholder already received a refund" },
  { value: "not-fraudulent", label: "Purchase was not fraudulent" },
  { value: "other", label: "Other reason" },
];

/** Illustrative scoring only, not a real evidence-scoring model. There's no
 * per-document-type selection any more (see RECOMMENDED_DOCUMENTS' own doc
 * comment) — the file picker has no way to know what evidence TYPE a given
 * upload actually is, so the estimate scales with how many documents were
 * uploaded overall, not which checklist items they correspond to. */
const WIN_CHANCE_BASE = 10;
const WIN_CHANCE_PER_FILE = 20;
const WIN_CHANCE_CAP = 95;
const ANALYSIS_DURATION_MS = 1400;
/** Always called out as the two most impactful evidence types, regardless
 * of what's been uploaded so far — "other" is too generic to recommend by
 * name. */
const KEY_DOCUMENT_KEYS = ["proof-of-delivery", "order-details"];

function winChancePct(filesCount: number): number {
  return Math.min(WIN_CHANCE_CAP, WIN_CHANCE_BASE + filesCount * WIN_CHANCE_PER_FILE);
}

interface DisputeRespondFormProps {
  mode: DisputeRespondMode;
  disputedAmount: number;
  currency: string;
  onBack: () => void;
  /** Receives the uploaded documents (name + preview URL, where there is
   * one) so the caller can show the same thumbnails in the submitted-
   * documents summary once the screen returns to the main detail view (see
   * TransactionDetailFeature's "Under review" notice). Object URLs handed
   * off this way become the caller's to eventually revoke — this form
   * itself only revokes ones that were never submitted. */
  onSubmit: (documents: SubmittedDocument[]) => void;
}

/** Second screen for both "Accept partially" and "Contest dispute", same
 * workflow either way except the contest-amount field only appears in
 * "partial" mode, see TransactionDetailFeature. */
export function DisputeRespondForm({
  mode,
  disputedAmount,
  currency,
  onBack,
  onSubmit,
}: DisputeRespondFormProps) {
  const [contestAmount, setContestAmount] = useState("");
  const [reason, setReason] = useState<ContestReason | "">("");
  const [otherReason, setOtherReason] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  // Whether the (simulated) analysis has finished for the current upload
  // state. `analyzing` is derived, not its own state, this is the only
  // state the effect below needs to touch, and only ever from inside a
  // setTimeout callback, never synchronously in the effect body, per the
  // CLAUDE.md hooks-purity rule.
  const [analyzed, setAnalyzed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Mirrors `files` for the unmount-only cleanup effect below, so that
  // effect's dependency array can stay empty (revoking on every `files`
  // change would free a still-displayed thumbnail's URL the moment a
  // second file is added).
  const filesRef = useRef<UploadedFile[]>(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);
  // Set right before onSubmit hands the preview URLs off to the caller (see
  // the Submit button below) — ownership of those URLs moves with them, so
  // this form must not revoke what it just submitted, only whatever was
  // uploaded and abandoned instead (e.g. the merchant navigated back
  // without submitting).
  const submittedRef = useRef(false);
  // Object URLs otherwise leak for the life of the tab, revoke whatever's
  // still outstanding — and unsubmitted — when this form unmounts
  // (individual removals are handled in removeFile below).
  useEffect(() => {
    return () => {
      if (submittedRef.current) return;
      for (const uploaded of filesRef.current) {
        if (uploaded.previewUrl) URL.revokeObjectURL(uploaded.previewUrl);
      }
    };
  }, []);

  const filesCount = files.length;
  // The AI recommendation only ever appears once a document has actually
  // been uploaded.
  const canAnalyze = filesCount > 0;
  const analyzing = canAnalyze && !analyzed;

  // Re-runs the (simulated) AI analysis on every new upload, so the
  // scanning animation plays again each time rather than only once.
  // Resetting `analyzed` to false (via a 0ms timeout, not synchronously) is
  // what makes `analyzing` flip back on above for a re-run, then the second
  // timeout flips it back to true once the "analysis" completes.
  useEffect(() => {
    const resetTimer = window.setTimeout(() => setAnalyzed(false), 0);
    if (!canAnalyze) {
      return () => window.clearTimeout(resetTimer);
    }
    const finishTimer = window.setTimeout(() => setAnalyzed(true), ANALYSIS_DURATION_MS);
    return () => {
      window.clearTimeout(resetTimer);
      window.clearTimeout(finishTimer);
    };
  }, [canAnalyze, filesCount]);

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const added: UploadedFile[] = Array.from(fileList).map((file) => ({
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }));
    setFiles((prev) => [...prev, ...added]);
    toast.success(added.length === 1 ? "Document uploaded" : `${added.length} documents uploaded`);
  }

  function removeFile(index: number) {
    setFiles((prev) => {
      const removed = prev[index];
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  // Uploading a single document is enough to enable submission, the reason
  // and (for partial accepts) amount fields don't gate the button.
  const canSubmit = filesCount > 0;

  // Purely for the timeline below, not used to gate canSubmit above.
  const contestAmountValue = Number(contestAmount);
  const amountEntered =
    contestAmount.trim() !== "" && contestAmountValue > 0 && contestAmountValue <= disputedAmount;
  const reasonEntered = reason !== "" && (reason !== "other" || otherReason.trim() !== "");

  // Each step's own field can be filled in any order (contest amount,
  // reason and documents are all independently editable), so its state
  // reflects only its own completion, never locked behind an unrelated
  // step. "Submit for review" is the one genuinely gated step: it can only
  // be actioned once canSubmit is true (a document has been uploaded),
  // matching the Submit button's own disabled state.
  const timelineSteps: DisputeFormStep[] =
    mode === "partial"
      ? [
          {
            label: "Enter contest amount",
            description: "Choose how much of the disputed amount you want to contest.",
            state: amountEntered ? "complete" : "current",
          },
          {
            label: "Choose a reason",
            description: "Tell us why you're contesting this dispute.",
            state: reasonEntered ? "complete" : "current",
          },
          {
            label: "Upload supporting documents",
            description: "Add evidence like receipts, delivery proof or authorization records.",
            state: filesCount > 0 ? "complete" : "current",
          },
          {
            label: "Submit for review",
            description: "Send your evidence to the card network for review.",
            state: canSubmit ? "current" : "locked",
          },
        ]
      : [
          {
            label: "Choose a reason",
            description: "Tell us why you're contesting this dispute.",
            state: reasonEntered ? "complete" : "current",
          },
          {
            label: "Upload supporting documents",
            description: "Add evidence like receipts, delivery proof or authorization records.",
            state: filesCount > 0 ? "complete" : "current",
          },
          {
            label: "Submit for review",
            description: "Send your evidence to the card network for review.",
            state: canSubmit ? "current" : "locked",
          },
        ];

  const winChance = winChancePct(filesCount);
  const suggestedDocs = RECOMMENDED_DOCUMENTS.filter((doc) => KEY_DOCUMENT_KEYS.includes(doc.key));

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

      {/* Full-width header row, outside the grid below, so the timeline
       * card's top edge lines up with the "Why do you want to contest
       * this?" card instead of with this title. */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {mode === "partial" ? "Accept partially" : "Contest dispute"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "partial"
              ? "Refund part of the disputed amount and contest the rest with supporting evidence."
              : "Provide supporting evidence to contest this dispute."}
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={!canSubmit}
          onClick={() => {
            submittedRef.current = true;
            onSubmit(files.map((f) => ({ name: f.file.name, previewUrl: f.previewUrl })));
          }}
        >
          Submit documents
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="flex flex-col gap-5">
          {mode === "partial" && (
            <Card className="gap-2 p-5">
              <Label htmlFor="contest-amount" className="text-sm font-semibold text-foreground">
                Amount you&apos;re contesting
              </Label>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Out of {formatCurrency(disputedAmount, currency)} {currency} disputed, enter the
                amount you want to contest, the rest will be refunded to the cardholder.
              </p>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  id="contest-amount"
                  type="number"
                  min={0}
                  max={disputedAmount}
                  step="0.01"
                  value={contestAmount}
                  onChange={(e) => setContestAmount(e.target.value)}
                  placeholder="0.00"
                  className="max-w-45"
                />
                <span className="text-sm font-medium text-muted-foreground">{currency}</span>
              </div>
            </Card>
          )}

          <Card className="gap-3 p-5">
            <p className="text-sm font-semibold text-foreground">
              Why do you want to contest this?
            </p>
            <RadioGroup value={reason} onValueChange={(v) => setReason(v as ContestReason)}>
              {REASON_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center gap-2.5">
                  <RadioGroupItem value={opt.value} id={`reason-${opt.value}`} />
                  <Label
                    htmlFor={`reason-${opt.value}`}
                    className="text-[13px] font-medium text-foreground/85"
                  >
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {reason === "other" && (
              <Textarea
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder="Describe your reason"
                className="mt-1"
              />
            )}
          </Card>

          <Card className="gap-0 p-5">
            <h2 className="text-lg font-bold text-foreground">Submit Supporting Evidence</h2>
            <Separator className="my-3" />
            <p className="text-sm text-muted-foreground">
              You&apos;ve chosen to {mode === "partial" ? "partially accept" : "contest"} this
              dispute. Upload the required supporting documents before the response deadline.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Submit all relevant documents to help strengthen your case
            </p>

            {/* Static, upload-independent guidance shown before the checklist,
             * distinct from the win-chance estimate below (which only appears
             * once a document has actually been uploaded). */}
            {suggestedDocs.length > 0 && (
              // Outer div is a slow-moving gradient (animate-gradient-border,
              // see globals.css), the 1.5px padding is what makes it read as a
              // subtle animated stroke around the callout rather than a solid
              // gradient fill, the Callout itself sits flush inside with its
              // own border removed.
              <div className="mt-4 animate-gradient-border rounded-xl bg-linear-to-r from-purple-300 via-indigo-300 to-purple-300 p-[1.5px] dark:from-purple-700/50 dark:via-indigo-700/50 dark:to-purple-700/50">
                <Callout
                  variant="discovery"
                  className="rounded-[11px] border-0 bg-linear-to-br from-purple-50 via-indigo-50 to-purple-100 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-purple-900/40"
                >
                  <CalloutIcon variant="discovery" />
                  <div>
                    <CalloutTitle>Smart Dispute Insight</CalloutTitle>
                    <CalloutText>
                      Based on similar cases, merchants who uploaded{" "}
                      <span className="font-semibold">
                        {suggestedDocs.map((d) => d.label).join(" and ")}
                      </span>{" "}
                      for this reason code won disputes more often.
                    </CalloutText>
                  </div>
                </Callout>
              </div>
            )}

            {/* Reference information, not a selection and not chips — no
             * pill shape, no border, no background, nothing that reads as
             * clickable. Plain labels in a row, separated by a middot, each
             * with a small (i) for its description on hover, so this stays
             * a single glance-able line instead of its own scrollable list. */}
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Documents you can submit
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-[13px] text-foreground/85">
              {RECOMMENDED_DOCUMENTS.map((doc, index) => (
                <span key={doc.key} className="inline-flex items-center gap-1.5">
                  {index > 0 && (
                    <span className="text-muted-foreground" aria-hidden="true">
                      ·
                    </span>
                  )}
                  <span className="font-medium">{doc.label}</span>
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Icon
                          name="info"
                          size={11}
                          className="shrink-0 cursor-default text-muted-foreground"
                        />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-55 text-xs">{doc.description}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </span>
              ))}
            </div>

            {/* AI evidence-strength feedback, only appears once at least one
             * file has been uploaded, a brief simulated "scanning" state
             * then a win-chance estimate that re-runs on every new upload. */}
            {canAnalyze && analyzing && (
              <Callout variant="neutral" className="mt-4">
                <Icon
                  name="loader"
                  size={16}
                  className="mt-0.5 shrink-0 animate-spin text-primary"
                  aria-hidden
                />
                <CalloutText className="mt-0 font-medium text-foreground opacity-100">
                  Scanning your uploaded documents…
                </CalloutText>
              </Callout>
            )}

            {canAnalyze && analyzed && (
              <Callout
                variant={winChance >= 70 ? "success" : winChance >= 45 ? "warning" : "error"}
                className="mt-4"
              >
                <CalloutIcon
                  variant={winChance >= 70 ? "success" : winChance >= 45 ? "warning" : "error"}
                />
                <div className="min-w-0 flex-1">
                  <CalloutTitle>
                    AI estimate: {winChance}% chance of winning this dispute with the current
                    documents
                  </CalloutTitle>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        winChance >= 70
                          ? "bg-emerald-500"
                          : winChance >= 45
                            ? "bg-amber-500"
                            : "bg-red-500"
                      )}
                      style={{ width: `${winChance}%` }}
                    />
                  </div>
                  {suggestedDocs.length > 0 && (
                    <CalloutText className="text-xs">
                      For better chances of winning, also upload{" "}
                      <span className="font-semibold">
                        {suggestedDocs.map((d) => d.label).join(" and ")}
                      </span>
                      .
                    </CalloutText>
                  )}
                </div>
              </Callout>
            )}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />

            {/* Uploaded files sit above the dropzone once there are any, so
             * adding more documents doesn't push the running list further
             * down the page every time. */}
            {files.length > 0 && (
              <ul className="mt-4 flex flex-col gap-1.5">
                {files.map((uploaded, i) => (
                  <li
                    key={`${uploaded.file.name}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-[13px] text-foreground/85">
                      {/* A small image thumbnail when the upload is an
                       * image (see addFiles), matching how Google/Gmail
                       * attachments preview — a non-image (a PDF) falls
                       * back to a plain file icon since there's nothing to
                       * render a preview from. */}
                      {uploaded.previewUrl ? (
                        <AppImage
                          src={uploaded.previewUrl}
                          alt=""
                          width={28}
                          height={28}
                          unoptimized
                          className="h-7 w-7 shrink-0 rounded-md border border-border object-cover"
                        />
                      ) : (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                          <Icon name="file-text" size={14} aria-hidden />
                        </span>
                      )}
                      <span className="truncate">{uploaded.file.name}</span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => removeFile(i)}
                      aria-label={`Remove ${uploaded.file.name}`}
                      className="h-6 w-6 min-h-0 min-w-0 shrink-0 rounded-md p-0 text-muted-foreground"
                    >
                      <Icon name="x" size={12} />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <Button
              type="button"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addFiles(e.dataTransfer.files);
              }}
              className="mt-4 h-auto min-h-30 w-full rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-6 text-center hover:bg-primary/10"
            >
              {/* Button wraps all of its children in a single inline span, so the
               * icon/title/subtitle need their own flex-col wrapper here, putting
               * flex-col on the Button itself has no effect since it only ever
               * has that one wrapper span as a direct child. */}
              <span className="flex flex-col items-center justify-center gap-2">
                <Icon name="upload" size={22} className="text-primary" aria-hidden />
                <span className="text-sm font-semibold text-primary">Upload documents</span>
                <span className="text-xs text-muted-foreground">PDF, JPG, PNG</span>
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
