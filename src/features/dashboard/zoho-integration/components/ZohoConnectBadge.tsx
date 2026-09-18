import { AppImage as Image } from "@/components/common/AppImage";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import type { IconName } from "@/components/icon";

/**
 * The "PayGlocal ⇄ Zoho" pairing shown at the top of every dialog in this
 * flow, so each one opens by naming the two accounts being joined or parted.
 *
 * The PayGlocal side is the PNG wordmark the Sidebar already uses; there is no
 * PayGlocal entry in the icon registry to reach for yet.
 */
export function ZohoConnectBadge({
  centerIcon = "link",
  className,
}: {
  /** Glyph between the two marks: a link for joining, something else for parting. */
  centerIcon?: IconName;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-center gap-2.5", className)}>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card p-2">
        <Image
          src="/assets/payglocal-logo.png"
          alt="PayGlocal"
          width={64}
          height={16}
          className="h-auto w-full object-contain"
        />
      </span>
      <Icon name={centerIcon} className="h-4 w-4 text-muted-foreground" aria-hidden />
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card">
        <Icon name="zoho-logo" className="h-6 w-6" aria-hidden />
      </span>
    </div>
  );
}
