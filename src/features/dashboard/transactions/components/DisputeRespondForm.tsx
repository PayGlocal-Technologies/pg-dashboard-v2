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
import { cn, formatCurrency } from "@/lib/utils";
import {
  DisputeFormTimelineCard,
  buildDisputeFormStepStates,
  type DisputeFormStep,
} from "@/features/dashboard/transactions/components/DisputeFormTimelineCard";

export type DisputeRespondMode = "partial" | "contest";
type ContestReason = "withdrawn" | "refunded" | "not-fraudulent" | "other";

interface RecommendedDocument {
  key: string;
  label: string;
  description: string;
}

/** Matches the reference exactly, "Order details" starts pre-selected. */
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

/** Illustrative weighting only, not a real evidence-scoring model. Base 10 +
 * order-details (20) + authorization (20) = 50, matching "just 50%" for
 * those two alone, proof-of-delivery is weighted highest since it's the
 * single strongest evidence type for a "not authorised"/"not received"
 * dispute. */
const WIN_CHANCE_BASE = 10;
const WIN_CHANCE_WEIGHTS: Record<string, number> = {
  "order-details": 20,
  authorization: 20,
  "proof-of-delivery": 30,
  "refund-policy": 15,
  other: 5,
};
const WIN_CHANCE_CAP = 95;
/** Doc types that, once selected AND at least one file has actually been
 * uploaded, trigger the AI analysis (see the reference: uploading order
 * details or the authorization copy). */
const ANALYSIS_TRIGGER_DOCS = ["order-details", "authorization"];
const ANALYSIS_DURATION_MS = 1400;

function winChancePct(selectedDocs: Set<string>): number {
  const total = RECOMMENDED_DOCUMENTS.reduce(
    (sum, doc) => sum + (selectedDocs.has(doc.key) ? (WIN_CHANCE_WEIGHTS[doc.key] ?? 0) : 0),
    WIN_CHANCE_BASE
  );
  return Math.min(WIN_CHANCE_CAP, total);
}

interface DisputeRespondFormProps {
  mode: DisputeRespondMode;
  disputedAmount: number;
  currency: string;
  onBack: () => void;
  onSubmit: () => void;
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
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set(["order-details"]));
  const [files, setFiles] = useState<File[]>([]);
  // Whether the (simulated) analysis has finished for the current
  // selection/upload state. `analyzing` is derived, not its own state, this
  // is the only state the effect below needs to touch, and only ever from
  // inside a setTimeout callback, never synchronously in the effect body,
  // per the CLAUDE.md hooks-purity rule.
  const [analyzed, setAnalyzed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasAnalysisTriggerDoc = ANALYSIS_TRIGGER_DOCS.some((key) => selectedDocs.has(key));
  const selectedDocsCount = selectedDocs.size;
  const filesCount = files.length;
  // The AI recommendation only ever appears once a document has actually
  // been uploaded, selecting a document-type chip alone is not enough.
  const canAnalyze = hasAnalysisTriggerDoc && filesCount > 0;
  const analyzing = canAnalyze && !analyzed;

  // Re-runs the (simulated) AI analysis whenever a relevant document type is
  // selected and a file has been uploaded for it, so the scanning animation
  // plays again on every new upload rather than only once. Resetting
  // `analyzed` to false (via a 0ms timeout, not synchronously) is what makes
  // `analyzing` flip back on above for a re-run, then the second timeout
  // flips it back to true once the "analysis" completes.
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
  }, [canAnalyze, selectedDocsCount, filesCount]);

  function toggleDoc(key: string) {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const added = Array.from(fileList);
    setFiles((prev) => [...prev, ...added]);
    toast.success(added.length === 1 ? "Document uploaded" : `${added.length} documents uploaded`);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // Uploading a single document is enough to enable submission, the reason
  // and (for partial accepts) amount fields don't gate the button.
  const canSubmit = filesCount > 0;

  // Purely for the timeline below, not used to gate canSubmit above.
  const contestAmountValue = Number(contestAmount);
  const amountEntered =
    contestAmount.trim() !== "" && contestAmountValue > 0 && contestAmountValue <= disputedAmount;
  const reasonEntered = reason !== "" && (reason !== "other" || otherReason.trim() !== "");

  // "Submit for review" is never "done" while this form is still mounted
  // (submitting moves the screen away), it only ever reaches "current" once
  // every step before it is complete, see buildDisputeFormStepStates.
  const timelineStepInfo =
    mode === "partial"
      ? [
          {
            label: "Enter contest amount",
            description: "Choose how much of the disputed amount you want to contest.",
            done: amountEntered,
          },
          {
            label: "Choose a reason",
            description: "Tell us why you're contesting this dispute.",
            done: reasonEntered,
          },
          {
            label: "Upload supporting documents",
            description: "Add evidence like receipts, delivery proof or authorization records.",
            done: filesCount > 0,
          },
          {
            label: "Submit for review",
            description: "Send your evidence to the card network for review.",
            done: false,
          },
        ]
      : [
          {
            label: "Choose a reason",
            description: "Tell us why you're contesting this dispute.",
            done: reasonEntered,
          },
          {
            label: "Upload supporting documents",
            description: "Add evidence like receipts, delivery proof or authorization records.",
            done: filesCount > 0,
          },
          {
            label: "Submit for review",
            description: "Send your evidence to the card network for review.",
            done: false,
          },
        ];
  const timelineStepStates = buildDisputeFormStepStates(timelineStepInfo.map((s) => s.done));
  const timelineSteps: DisputeFormStep[] = timelineStepInfo.map((step, i) => ({
    label: step.label,
    description: step.description,
    state: timelineStepStates[i]!,
  }));

  const winChance = winChancePct(selectedDocs);
  // Highest-impact missing documents first, "other" doesn't get suggested
  // (too generic to recommend by name).
  const suggestedDocs = RECOMMENDED_DOCUMENTS.filter(
    (doc) => doc.key !== "other" && !selectedDocs.has(doc.key)
  )
    .sort((a, b) => (WIN_CHANCE_WEIGHTS[b.key] ?? 0) - (WIN_CHANCE_WEIGHTS[a.key] ?? 0))
    .slice(0, 2);

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

      <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="flex flex-col gap-5">
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
              onClick={onSubmit}
            >
              Submit documents
            </Button>
          </div>

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

            <div className="mt-4 flex flex-wrap gap-2.5">
              {RECOMMENDED_DOCUMENTS.map((doc) => {
                const selected = selectedDocs.has(doc.key);
                return (
                  <div
                    key={doc.key}
                    className={cn(
                      "flex items-center gap-1 rounded-full border-2 py-1 pl-3.5 pr-1",
                      selected ? "border-solid border-primary" : "border-dashed border-border"
                    )}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => toggleDoc(doc.key)}
                      className={cn(
                        "h-auto min-h-0 gap-0 rounded-none border-0 bg-transparent p-0 text-[13px] font-medium",
                        selected ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {doc.label}
                    </Button>
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            aria-label={`About ${doc.label}`}
                            className="h-5 w-5 min-h-0 min-w-0 shrink-0 rounded-full p-0 text-muted-foreground"
                          >
                            <Icon name="info" size={11} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-55 text-xs">
                          {doc.description}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                );
              })}
            </div>

            {/* AI evidence-strength feedback, only appears once a file has been
             * uploaded for Order details or the Authorization copy (see
             * ANALYSIS_TRIGGER_DOCS), a brief simulated "scanning" state then a
             * win-chance estimate that re-runs on every new upload. */}
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
                {files.map((file, i) => (
                  <li
                    key={`${file.name}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-[13px] text-foreground/85">
                      <Icon
                        name="file-text"
                        size={14}
                        className="shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <span className="truncate">{file.name}</span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => removeFile(i)}
                      aria-label={`Remove ${file.name}`}
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
