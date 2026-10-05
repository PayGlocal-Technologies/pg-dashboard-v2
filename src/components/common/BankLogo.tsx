import { Icon, type IconName } from "@/components/icon";
import { cn } from "@/lib/utils";

/** Bank names as they arrive (any case, "Bank"/"Ltd" or not), matched to a
 *  registry logo. Add a bank here once its logo is in the icon registry. */
const BANK_LOGOS: { match: RegExp; icon: IconName }[] = [
  { match: /\bhdfc\b/i, icon: "hdfc-logo" },
  { match: /\bicici\b/i, icon: "icici-logo" },
  { match: /\baxis\b/i, icon: "axis-logo" },
  { match: /\b(sbi|state bank of india)\b/i, icon: "sbi-logo" },
  { match: /\bkotak\b/i, icon: "kotak-logo" },
];

export function bankLogoFor(name?: string): IconName | undefined {
  if (!name) return undefined;
  return BANK_LOGOS.find((b) => b.match.test(name))?.icon;
}

/**
 * A bank's logo, sized to sit beside its name. A bank without a logo yet gets
 * a neutral bank glyph in the same frame, so a column of banks stays aligned.
 * Decorative: the name beside it always carries the meaning.
 */
export function BankLogo({ name, className }: { name?: string; className?: string }) {
  const icon = bankLogoFor(name);
  if (icon) return <Icon name={icon} aria-hidden className={cn("h-5 w-5 shrink-0", className)} />;
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground",
        className
      )}
    >
      <Icon name="building-2" size={11} />
    </span>
  );
}

/** A bank's logo and name together, as a detail value. */
export function BankName({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <BankLogo name={name} />
      <span>{name}</span>
    </span>
  );
}
