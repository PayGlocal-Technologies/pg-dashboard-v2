import { toast } from "sonner";
import { Badge, Button, Callout, CalloutTitle, Card, Separator } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { cn } from "@/lib/utils";
import { ACTION_CARD_CLASS } from "@/features/dashboard/pa-transactions/components/TransactionDetailPrimitives";
import {
  DisputeStepList,
  type DisputeFormStep,
} from "@/features/dashboard/dispute-management/components/detail/DisputeFormTimelineCard";

/** A document on the case, from `/v2/cb/{cbId}/doc/details`: opened from its link. */
export interface SubmittedDocument {
  name: string;
  url?: string | null;
  /** The document type, e.g. "Proof of delivery". */
  label?: string | null;
}

interface DisputeStatusNoticeCardProps {
  icon: IconName;
  /** Background + icon color, e.g. "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400". */
  iconClassName: string;
  title: string;
  description: string;
  /** "N days to respond" / "Past due", for a state with a deadline. */
  badge?: { text: string; tone: "danger" | "warning" | "muted" };
  /** The dispute's progress, embedded in the card. */
  steps?: DisputeFormStep[];
  documents?: SubmittedDocument[];
  /** "Submitted documents" or "Uploaded documents". */
  documentsTitle?: string;
  /** Only for a state that still needs the merchant to act (upload evidence). */
  action?: { label: string; onClick: () => void };
  onLearnMore?: () => void;
  /** A boxed note under the description, e.g. the red "What this means" when a fee was charged. */
  callout?: { tone: "error" | "warning" | "info"; title: string; points: string[] };
}

const BADGE_VARIANT = { danger: "error", warning: "warning", muted: "secondary" } as const;

function openDocument(doc: SubmittedDocument) {
  if (doc.url) window.open(doc.url, "_blank", "noopener,noreferrer");
  else toast.error("Document is not available.");
}

/** Takes the action card's slot once the dispute is past its first decision. */
export function DisputeStatusNoticeCard({
  icon,
  iconClassName,
  title,
  description,
  badge,
  steps,
  documents,
  documentsTitle = "Submitted documents",
  action,
  onLearnMore,
  callout,
}: DisputeStatusNoticeCardProps) {
  return (
    // Only a notice that asks for something (more evidence) gets the
    // action-card wash; a purely informational one stays plain.
    <Card className={cn("gap-0 p-5", action ? ACTION_CARD_CLASS : "shadow-none")}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            iconClassName
          )}
        >
          <Icon name={icon} size={18} aria-hidden />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-base font-bold text-foreground">{title}</h2>
            {badge && (
              <Badge variant={BADGE_VARIANT[badge.tone]} size="sm" className="rounded-md">
                {badge.text}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {action && (
              <Button type="button" variant="primary" size="sm" onClick={action.onClick}>
                {action.label}
              </Button>
            )}
            {onLearnMore && (
              <Button
                type="button"
                variant="link"
                onClick={onLearnMore}
                className="h-auto min-h-0 p-0 text-xs font-medium"
              >
                Learn more
              </Button>
            )}
          </div>
        </div>
      </div>

      {callout && (
        <Callout variant={callout.tone} className="mt-4">
          <Icon name="alert-triangle" size={16} aria-hidden className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <CalloutTitle className="text-sm font-semibold">{callout.title}</CalloutTitle>
            <div className="mt-1 text-sm leading-relaxed opacity-90">
              <ul className="list-disc space-y-0.5 pl-4 text-[13px]">
                {callout.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </Callout>
      )}

      {documents && documents.length > 0 && (
        <>
          <Separator className="my-4" />
          <p className="text-xs font-semibold text-muted-foreground">
            {documentsTitle} ({documents.length})
          </p>
          <DocumentChips documents={documents} />
        </>
      )}

      {steps && steps.length > 0 && (
        <>
          <Separator className="my-4" />
          <DisputeStepList steps={steps} />
        </>
      )}
    </Card>
  );
}

/** The case's documents as chips; each opens its file in a new tab. */
export function DocumentChips({ documents }: { documents: SubmittedDocument[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {documents.map((doc, i) => (
        <li key={`${doc.name}-${i}`} className="max-w-full">
          <Button
            type="button"
            variant="outline"
            onClick={() => openDocument(doc)}
            aria-label={`${doc.name}, open in a new tab`}
            className="h-auto min-h-0 max-w-full justify-start gap-2 rounded-lg bg-muted/40 px-3 py-2 shadow-none"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Icon name="file-text" size={14} aria-hidden />
              </span>
              <span className="flex min-w-0 flex-col items-start">
                <span className="max-w-60 truncate text-[13px] font-normal text-foreground/85">
                  {doc.name}
                </span>
                {doc.label && (
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {doc.label}
                  </span>
                )}
              </span>
            </span>
          </Button>
        </li>
      ))}
    </ul>
  );
}
