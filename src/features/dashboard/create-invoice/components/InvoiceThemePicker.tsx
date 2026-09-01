"use client";

import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { withAlpha } from "@/features/dashboard/create-invoice/helpers";
import type { InvoiceLayoutId, InvoiceTheme } from "@/features/dashboard/create-invoice/types";

/**
 * A schematic of each layout, drawn in the merchant's own colours.
 *
 * Deliberately abstract: a legible miniature of a real invoice at this size is
 * illegible anyway, and what distinguishes these six is where the mass sits —
 * a left rail, a centred stack, a bordered card. Bars carry that; 6pt text
 * would not. Real content is one click away in the preview beside it.
 */
function ThemeThumbnail({
  layout,
  primary,
  accent,
}: {
  layout: InvoiceLayoutId;
  primary: string;
  accent: string;
}) {
  const bar = (width: string, color: string, height = "h-1") => (
    <span className={cn("block rounded-full", height)} style={{ width, backgroundColor: color }} />
  );

  const faint = withAlpha(primary, 0.25);
  const faintAccent = withAlpha(accent, 0.35);

  if (layout === "bold-sidebar") {
    return (
      <span className="flex h-full w-full gap-1 p-1.5">
        <span className="w-1.5 shrink-0 rounded" style={{ backgroundColor: primary }} />
        <span className="flex flex-1 flex-col justify-center gap-1">
          {bar("70%", faint)}
          {bar("45%", faint)}
          {bar("85%", faintAccent)}
        </span>
      </span>
    );
  }

  if (layout === "playful-border") {
    return (
      <span
        className="flex h-full w-full flex-col justify-center gap-1 rounded-md border-2 p-1.5"
        style={{ borderColor: primary, backgroundColor: withAlpha(accent, 0.08) }}
      >
        {bar("100%", primary, "h-1.5")}
        {bar("60%", faintAccent)}
        {bar("75%", faintAccent)}
      </span>
    );
  }

  if (layout === "y2k-bold") {
    return (
      <span className="flex h-full w-full flex-col items-center justify-center gap-1 p-1.5">
        <span className="flex items-center gap-1">
          <Icon name="sparkles" className="h-2 w-2" style={{ color: primary }} />
          {bar("2rem", primary, "h-1.5")}
          <Icon name="sparkles" className="h-2 w-2" style={{ color: primary }} />
        </span>
        {bar("80%", faintAccent)}
        {bar("60%", faintAccent)}
      </span>
    );
  }

  if (layout === "geometric-modern") {
    return (
      <span className="flex h-full w-full flex-col justify-center gap-1 p-1.5">
        <span className="flex items-center gap-1">
          <span className="block h-2 w-2 rounded-full" style={{ backgroundColor: faintAccent }} />
          {bar("2.5rem", primary, "h-1.5")}
        </span>
        {bar("70%", faint)}
        <span
          className="mt-0.5 block h-2 w-8 self-end rounded-full"
          style={{ backgroundColor: faintAccent }}
        />
      </span>
    );
  }

  if (layout === "minimal-mono") {
    return (
      <span className="flex h-full w-full flex-col justify-center gap-1 p-1.5">
        <span className="flex items-center justify-between">
          <span className="block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: primary }} />
          {bar("1.75rem", primary, "h-1.5")}
        </span>
        <span className="mt-1 block h-px w-full" style={{ backgroundColor: primary }} />
        {bar("100%", faint)}
        {bar("100%", faint)}
      </span>
    );
  }

  // classic
  return (
    <span className="flex h-full w-full flex-col justify-center gap-1 p-1.5">
      <span className="flex items-center gap-1">
        <span className="block h-2.5 w-2.5 rounded" style={{ backgroundColor: faint }} />
        {bar("1.5rem", primary, "h-1.5")}
      </span>
      <span
        className="mt-1 block h-3 w-full rounded-sm border"
        style={{ borderColor: faint, backgroundColor: withAlpha(primary, 0.06) }}
      />
      {bar("40%", faint)}
    </span>
  );
}

/**
 * Invoice theme.
 *
 * The list is the server's: `GET /themes` says which layouts the renderer can
 * produce, and the invoice stores the chosen name. Every card therefore draws in
 * the merchant's current colour pair rather than in per-theme defaults, because
 * that pair is what the renderer will apply to whichever theme they land on.
 *
 * A theme the server offers that this build has no thumbnail for still appears,
 * drawn through the Classic schematic — see `themeFor`.
 */
export function InvoiceThemePicker({
  themes,
  theme,
  primaryHex,
  accentHex,
  onChange,
}: {
  themes: InvoiceTheme[];
  /** The selected theme's enum name. */
  theme: string;
  primaryHex: string;
  accentHex: string;
  onChange: (theme: string) => void;
}) {
  return (
    <div
      className="grid grid-cols-2 gap-2 sm:grid-cols-3"
      role="radiogroup"
      aria-label="Invoice theme"
    >
      {themes.map((option) => {
        const selected = option.name === theme;

        return (
          <Button
            key={option.name}
            type="button"
            variant="outline"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.name)}
            className={cn(
              "h-auto p-2 text-left [&>span]:w-full",
              selected ? "border-primary bg-primary/5" : "border-border"
            )}
          >
            {/* One child, carrying the column. flux wraps every child of a
                Button in a single plain <span>, so `flex-col gap-2` set on the
                button itself would never reach these two. */}
            <span className="flex flex-col gap-2">
              <span className="block aspect-[4/3] overflow-hidden rounded-md border border-border bg-card">
                <ThemeThumbnail layout={option.layout} primary={primaryHex} accent={accentHex} />
              </span>

              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-[12px] font-medium text-foreground">
                  {option.label}
                </span>
                {option.isNew && (
                  <span className="shrink-0 rounded bg-primary/10 px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-primary">
                    New
                  </span>
                )}
                {selected && (
                  <Icon name="check" className="ml-auto h-3 w-3 shrink-0 text-primary" />
                )}
              </span>
            </span>
          </Button>
        );
      })}
    </div>
  );
}
