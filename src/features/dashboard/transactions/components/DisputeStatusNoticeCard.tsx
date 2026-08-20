import { Card } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { cn } from "@/lib/utils";

interface DisputeStatusNoticeCardProps {
  icon: IconName;
  /** Background + icon color, e.g. "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400". */
  iconClassName: string;
  title: string;
  description: string;
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
        </div>
      </div>
    </Card>
  );
}
