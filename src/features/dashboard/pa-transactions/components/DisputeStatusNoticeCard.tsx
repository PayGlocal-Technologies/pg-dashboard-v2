import { Button, Card, Separator } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { AppImage } from "@/components/common/AppImage";
import { cn } from "@/lib/utils";
import {
  DisputeStepList,
  type DisputeFormStep,
} from "@/features/dashboard/pa-transactions/components/DisputeFormTimelineCard";

/** A file submitted on the Contest/Accept-partially screen (see
 * DisputeRespondForm's onSubmit) — `previewUrl` is only ever present for a
 * document uploaded THIS session (an object URL, see DisputeRespondForm's
 * own addFiles), never for a name coming from dispute.documents (mock/
 * persisted data with no real file behind it), so those fall back to the
 * plain file icon below. */
export interface SubmittedDocument {
  name: string;
  previewUrl?: string | null;
}

interface DisputeStatusNoticeCardProps {
  icon: IconName;
  /** Background + icon color, e.g. "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400". */
  iconClassName: string;
  title: string;
  description: string;
  /** When present, renders the same vertical-line timeline used on the
   * Contest/Accept-partially screen (see DisputeFormTimelineCard), showing
   * what's already happened and what's still ahead in the dispute's
   * lifecycle, embedded directly in this card rather than as its own. */
  steps?: DisputeFormStep[];
  /** Documents submitted for review, shown as a quick summary of what was
   * sent, with an image thumbnail wherever one is available. */
  documents?: SubmittedDocument[];
  /** Only present for a state that still needs the merchant to act (e.g.
   * INSUFFICIENT_DOCUMENTS asking for more evidence), reuses the same
   * Contest flow entry point as the initial DisputeActionCard. */
  action?: { label: string; onClick: () => void };
  /** Opens the stage-specific explainer pop-up (see DisputeStageGuideDialog),
   * shown for every status this card renders, not just an awaiting-decision
   * one — the same "Learn more" entry point DisputeActionCard already has. */
  onLearnMore?: () => void;
}

/** Replaces DisputeActionCard in the same slot once there is nothing left
 * to accept or contest, a decision has already been made, either the
 * merchant submitted evidence ("under review") or accepted the dispute in
 * full ("closed"), see TransactionDetailFeature. */
export function DisputeStatusNoticeCard({
  icon,
  iconClassName,
  title,
  description,
  steps,
  documents,
  action,
  onLearnMore,
}: DisputeStatusNoticeCardProps) {
  return (
    <Card className="gap-0 p-5">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            iconClassName
          )}
        >
          <Icon name={icon} size={18} aria-hidden />
        </span>
        <div>
          <h2 className="text-base font-bold text-foreground">{title}</h2>
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

      {documents && documents.length > 0 && (
        <>
          <Separator className="my-4" />
          <p className="text-xs font-semibold text-muted-foreground">
            Submitted documents ({documents.length})
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {documents.map((doc, i) => (
              <li
                key={`${doc.name}-${i}`}
                className="flex max-w-full items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2"
              >
                {doc.previewUrl ? (
                  <AppImage
                    src={doc.previewUrl}
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
                <span className="truncate text-[13px] text-foreground/85">{doc.name}</span>
              </li>
            ))}
          </ul>
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
