import type { ReactNode } from "react";
import { toast } from "sonner";
import { Button, Card, CardContent } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { CopyableCell } from "@/components/common/CopyableCell";

// Shared by TransactionDetailsDrawer, TransactionDetailFeature and
// DisputeDetailFeature so they present transaction fields with identical
// label/value typography. Matched to the Multi-Currency Accounts transaction
// details page (mca-transactions/components/TransactionDetailsPage.tsx), so a
// Payments transaction and an MCA one read as the same screen.

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

/** `stacked` (default): label above, value below, as in the MCA details
 *  cards. `inline`: label on the left, value right-aligned on the same line,
 *  for a compact card of short values (e.g. Payment Details). */
type DetailRowLayout = "stacked" | "inline";

interface DetailRowProps {
  /** Usually text; a node when the label carries an ⓘ explanation. */
  label: ReactNode;
  value: ReactNode;
  layout?: DetailRowLayout;
}

/** Label above, value below, as in the MCA details cards (see DetailRowLayout). */
export function DetailRow({ label, value, layout = "stacked" }: DetailRowProps) {
  if (layout === "inline") {
    return (
      <div className="flex items-center justify-between gap-4">
        <span className="shrink-0 text-[12px] text-muted-foreground">{label}</span>
        <div className="min-w-0 wrap-break-word text-right text-[13px] font-medium text-foreground">
          {value}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      {/* break-words: an arbitrary string value here (an ID, a long
       * unbroken merchant reference) has no whitespace to wrap on
       * otherwise, and would force this card, and the whole right-column
       * grid track it sits in, wider than its track, causing page-level
       * horizontal scroll. */}
      <div className="wrap-break-word text-[13px] font-medium text-foreground">{value}</div>
    </div>
  );
}

interface CopyableDetailRowProps {
  label: string;
  /** What is shown, e.g. a truncated ID. */
  value: string;
  /** What reaches the clipboard, when it differs from `value`. */
  copyValue?: string;
  monospace?: boolean;
  /** Wrap across lines instead of truncating, for long text like an address. */
  wrap?: boolean;
  layout?: DetailRowLayout;
}

/** DetailRow whose value has a copy button, revealed on hovering anywhere in
 *  the field (the `group` here), not only the value itself. */
export function CopyableDetailRow({
  label,
  value,
  copyValue,
  monospace,
  wrap,
  layout = "stacked",
}: CopyableDetailRowProps) {
  const inline = layout === "inline";
  if (inline) {
    const full = copyValue ?? value;
    return (
      <div className="group flex items-center justify-between gap-4">
        <span className="shrink-0 text-[12px] text-muted-foreground">{label}</span>
        {/* The copy control sits on the value itself, over its right end.
            On hover the value's tail dissolves under a gradient mask (the
            last ~44px fade to nothing), so the button reads cleanly on top
            without a backing chip. The mask is 44px wider than the value: at
            rest its fade hangs off the right edge (value fully visible), and
            hover slides it 44px left onto the value's tail. */}
        <div className="relative min-w-0">
          <span
            title={full}
            className="block truncate text-right text-[13px] font-medium tabular-nums text-foreground transition-[mask-position] duration-200 [mask-image:linear-gradient(to_left,transparent_0,transparent_20px,black_44px)] [mask-position:0_0] [mask-repeat:no-repeat] [mask-size:calc(100%_+_44px)_100%] group-focus-within:[mask-position:-44px_0] group-hover:[mask-position:-44px_0]"
          >
            {value}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Copy ${label}`}
            onClick={() => {
              void navigator.clipboard.writeText(full).then(() => toast.success(`${label} copied`));
            }}
            className="absolute top-1/2 right-0 h-6 w-6 min-h-0 min-w-0 -translate-y-1/2 rounded-md p-0 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-muted hover:text-foreground"
          >
            <Icon name="copy" className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="group flex flex-col gap-1">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <CopyableCell
        value={value}
        copyValue={copyValue}
        label={label}
        monospace={monospace}
        className={cn("text-[13px] font-medium text-foreground", wrap && "items-start")}
        valueClassName={wrap ? "whitespace-normal leading-snug wrap-break-word" : undefined}
      />
    </div>
  );
}

/**
 * A details-page section: the uppercase label outside, one flat card inside.
 * The MCA page's "title outside + card inside" module, so every section on
 * both products has the same spacing, surface and padding.
 */
export function DetailSection({
  title,
  children,
  className,
  cardClassName,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  cardClassName?: string;
}) {
  return (
    <section className={className}>
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <Card size="sm" className={cn("shadow-none", cardClassName)}>
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>
    </section>
  );
}

/**
 * Surface for a card that asks the merchant to do something (Accept / Contest
 * a dispute, upload more evidence): the same faint white-to-blue wash as the
 * MCA "Upload invoice" action card, so actionable cards are recognisable on
 * every details page. Informational cards stay plain.
 */
export const ACTION_CARD_CLASS =
  "shadow-none border-blue-100 bg-linear-to-br from-white via-white to-blue-100/70 dark:border-blue-900/40 dark:from-card dark:via-card dark:to-blue-950/40";

/** The details page's Back link, styled as on the MCA page. */
export function DetailBackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      leftIcon={<Icon name="chevron-left" className="h-4 w-4" />}
      onClick={onClick}
      className="w-fit pl-0 text-primary hover:text-primary-hover"
    >
      {label}
    </Button>
  );
}
