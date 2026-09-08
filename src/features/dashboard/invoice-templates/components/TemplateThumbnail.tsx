"use client";

import { useMemo } from "react";
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
 */
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

  return (
    // aria-hidden and no focus target: everything this conveys is also in the
    // card's own text, so a screen reader gains nothing from a whole invoice
    // document read out per row.
    <div
      aria-hidden
      className="pointer-events-none h-[132px] w-full overflow-hidden rounded-lg border border-border bg-white"
    >
      <div className="h-[600px] w-[794px] origin-top-left scale-[0.28]">
        <InvoiceDocumentPreview source={source} />
      </div>
    </div>
  );
}
