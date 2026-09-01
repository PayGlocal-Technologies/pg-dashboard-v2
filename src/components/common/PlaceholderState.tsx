import type { ReactNode } from "react";
import { AppImage } from "@/components/common/AppImage";
import { cn } from "@/lib/utils";

/**
 * A centred illustration + title + optional description/action, for the app's
 * empty, error, and offline states. One place so every "nothing here" / "it
 * broke" surface reads the same way instead of each feature hand-rolling its
 * own.
 *
 * The illustrations are the design set shipped in public/assets. They're static
 * files rather than icon-registry components (unlike logos/icons) because they
 * are large decorative artwork sized by the box, not themeable glyphs, and are
 * rendered through AppImage — which applies the base path — exactly as the
 * platform logos in public/assets already are. `unoptimized` because these are
 * SVGs, which Next's image optimizer does not process.
 */
export type PlaceholderVariant =
  | "no-transactions"
  | "no-failed-transactions"
  | "no-invoices"
  | "no-overdue-invoices"
  | "no-settlements"
  | "no-payment-links"
  | "no-expired-links"
  | "no-notifications"
  | "no-analytics"
  | "no-data"
  | "no-internet"
  | "error"
  | "404";

const VARIANT_ASSET: Record<PlaceholderVariant, string> = {
  "no-transactions": "/assets/no-transactions.svg",
  "no-failed-transactions": "/assets/no-failed-transactions.svg",
  "no-invoices": "/assets/no-invoices.svg",
  "no-overdue-invoices": "/assets/no-overdue-invoices.svg",
  "no-settlements": "/assets/no-settlements.svg",
  "no-payment-links": "/assets/no-payment-links.svg",
  "no-expired-links": "/assets/no-expired-links.svg",
  "no-notifications": "/assets/no-notifications.svg",
  "no-analytics": "/assets/no-analytics.svg",
  "no-data": "/assets/no-data-available.svg",
  "no-internet": "/assets/no-internet.svg",
  error: "/assets/something-went-wrong.svg",
  "404": "/assets/404-error.svg",
};

/** Illustration edge length in px. The artwork is square (200×200 viewBox). */
const SIZE_PX = { sm: 88, md: 132, lg: 180 } as const;

/**
 * Per-variant scale correcting for uneven internal padding: each 200×200 SVG
 * fills a different share of its canvas (measured content-fill 0.67–1.00), so
 * at one box size they'd look unequal. Each factor is ~0.80 / fill, normalising
 * the drawn artwork to roughly the same apparent size across every variant.
 */
const VARIANT_SCALE: Record<PlaceholderVariant, number> = {
  "no-transactions": 1.13,
  "no-failed-transactions": 0.98,
  "no-invoices": 1.19,
  "no-overdue-invoices": 1.07,
  "no-settlements": 1.1,
  "no-payment-links": 1.18,
  "no-expired-links": 0.92,
  "no-notifications": 0.94,
  "no-analytics": 0.9,
  "no-data": 0.94,
  "no-internet": 1.07,
  error: 1.05,
  "404": 0.8,
};

interface PlaceholderStateProps {
  variant: PlaceholderVariant;
  title: string;
  description?: string;
  /** A button or link — e.g. "Retry", "Create invoice". */
  action?: ReactNode;
  size?: keyof typeof SIZE_PX;
  className?: string;
}

export function PlaceholderState({
  variant,
  title,
  description,
  action,
  size = "md",
  className,
}: PlaceholderStateProps) {
  const px = Math.round(SIZE_PX[size] * VARIANT_SCALE[variant]);
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-10 text-center",
        className
      )}
    >
      {/* Decorative — the title carries the meaning, so alt is empty. */}
      <AppImage
        src={VARIANT_ASSET[variant]}
        alt=""
        width={px}
        height={px}
        unoptimized
        style={{ width: px, height: px }}
        className="shrink-0"
      />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="mx-auto max-w-xs text-[13px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
