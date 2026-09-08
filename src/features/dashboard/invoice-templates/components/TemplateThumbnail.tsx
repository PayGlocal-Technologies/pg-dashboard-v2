"use client";

import { useEffect, useMemo, useRef } from "react";
import { InvoiceDocumentPreview } from "@/features/dashboard/create-invoice/components/preview/InvoiceDocumentPreview";
import { emptyForm } from "@/features/dashboard/create-invoice/helpers";
import { applyTemplateSnapshot } from "@/features/dashboard/invoice-templates/helpers";
import type { InvoiceThemePalette } from "@/features/dashboard/create-invoice/hooks";
import type { InvoiceTemplate } from "@/features/dashboard/invoice-templates/types";

/**
 * The template's document, drawn small.
 *
 * A template used to be describable only as "3 items · USD · due 30 days",
 * which is the same string for two retainers billing two different clients.
 * The six layout renderers already exist and are pure, so the cheapest way to
 * make a template recognisable is to draw it — theme, colours, item names and
 * all — at a size you can scan a grid of.
 *
 * Rendered at full width and scaled down with a transform rather than being
 * re-laid-out at thumbnail size: the layouts are built for a sheet of paper and
 * would reflow into something that is not what the merchant will send. The
 * transform keeps the proportions honest, which is the whole point of showing
 * it.
 *
 * The scale is measured, not fixed. A hard `scale-[0.28]` renders the 794px
 * sheet at a constant 222px however wide the card is, so in a three-column grid
 * the thumbnail sat in ~180px of empty background.
 *
 * Measured rather than expressed in CSS because CSS cannot express it:
 * `scale()` takes a unitless number, and `calc()` will not divide a length by a
 * length, so there is no `100cqw / 794px` to write — a container query gets you
 * the width and no way to turn it into a ratio. A ResizeObserver writing a
 * custom property is the small, honest version of that arithmetic. It writes to
 * the node directly instead of through state, so re-measuring costs no render.
 */

/** The sheet the document layouts are built for, in px. */
const SHEET_WIDTH = 794;
const SHEET_HEIGHT = 600;

/**
 * The scale used until the first measurement lands.
 *
 * The previous fixed factor, so a card that has not been measured yet is
 * merely narrow rather than showing a sheet at full size and clipping it.
 */
const FALLBACK_SCALE = 0.28;

export function TemplateThumbnail({
  template,
  palette,
  today,
}: {
  template: InvoiceTemplate;
  palette: InvoiceThemePalette;
  today: string;
}) {
  const source = useMemo(() => {
    const form = {
      ...emptyForm(today, template.snapshot.currency),
      ...applyTemplateSnapshot(template),
    };
    return {
      form,
      biller: undefined,
      client: undefined,
      account: undefined,
      logoUrl: undefined,
      signatureUrl: undefined,
      symbol: "",
      placeholders: true,
      theme: template.snapshot.theme,
      primaryHex: palette.colorHexFor(template.snapshot.color),
      accentHex: palette.accentHexFor(template.snapshot.accent),
    };
  }, [template, palette, today]);

  const boxRef = useRef<HTMLDivElement>(null);

  /**
   * Keeps the sheet exactly as wide as the card.
   *
   * Writes the ratio to a custom property on the box rather than to state:
   * nothing in React needs to know the number, and a `setState` here would
   * re-render every card on every grid resize. The first call runs inline so
   * the correct scale is in place before paint.
   */
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    const measure = () => {
      const width = box.clientWidth;
      if (width > 0) box.style.setProperty("--sheet-scale", String(width / SHEET_WIDTH));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return (
    // aria-hidden and no focus target: everything this conveys is also in the
    // card's own text, so a screen reader gains nothing from a whole invoice
    // document read out per row.
    <div
      ref={boxRef}
      aria-hidden
      className="pointer-events-none relative h-[132px] w-full overflow-hidden rounded-lg border border-border bg-white"
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: SHEET_WIDTH,
          height: SHEET_HEIGHT,
          // Width fills the card; the height is left to crop, because a peek at
          // the top of the document is the intent and fitting a whole sheet
          // into 132px would make it unreadable.
          transform: `scale(var(--sheet-scale, ${FALLBACK_SCALE}))`,
        }}
      >
        <InvoiceDocumentPreview source={source} />
      </div>
    </div>
  );
}
