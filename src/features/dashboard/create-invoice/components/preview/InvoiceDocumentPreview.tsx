"use client";

import {
  buildPreviewModel,
  type PreviewSource,
} from "@/features/dashboard/create-invoice/components/preview/previewModel";
import { ClassicLayout } from "@/features/dashboard/create-invoice/components/preview/layouts/ClassicLayout";
import { MinimalMonoLayout } from "@/features/dashboard/create-invoice/components/preview/layouts/MinimalMonoLayout";
import { BoldSidebarLayout } from "@/features/dashboard/create-invoice/components/preview/layouts/BoldSidebarLayout";
import { PlayfulBorderLayout } from "@/features/dashboard/create-invoice/components/preview/layouts/PlayfulBorderLayout";
import { Y2kBoldLayout } from "@/features/dashboard/create-invoice/components/preview/layouts/Y2kBoldLayout";
import { GeometricModernLayout } from "@/features/dashboard/create-invoice/components/preview/layouts/GeometricModernLayout";
import type { InvoiceLayoutId } from "@/features/dashboard/create-invoice/types";
import type { LayoutProps } from "@/features/dashboard/create-invoice/components/preview/layouts/types";

export type { PreviewSource };

const LAYOUTS: Record<InvoiceLayoutId, (props: LayoutProps) => React.JSX.Element> = {
  classic: ClassicLayout,
  "minimal-mono": MinimalMonoLayout,
  "bold-sidebar": BoldSidebarLayout,
  "playful-border": PlayfulBorderLayout,
  "y2k-bold": Y2kBoldLayout,
  "geometric-modern": GeometricModernLayout,
};

/**
 * The invoice document, in whichever theme the merchant picked.
 *
 * This component owns two things only: the sheet of paper, and which layout gets
 * drawn on it. Everything a layout needs is derived once by `buildPreviewModel`
 * and handed over — see previewModel.ts for why that split matters with six of
 * them.
 *
 * This is a preview, never the artifact. The PDF that is stored and emailed is
 * the server's, so nothing here rasterizes or downloads, and the server renders
 * one layout in English with no colour parameters. Until it takes a layout, a
 * colour pair and a locale, only `classic` matches the document a customer
 * receives — which is why the theme picker badges it and why it is the default.
 */
export function InvoiceDocumentPreview({
  source,
  onLogoClick,
}: {
  source: PreviewSource;
  /** Opens the logo dialog from the placeholder on the document itself. */
  onLogoClick?: () => void;
}) {
  const model = buildPreviewModel(source);
  const Layout = LAYOUTS[model.style.layout] ?? ClassicLayout;

  /**
   * Whether the logo slot is offered at all, which is not the same question as
   * whether a logo is drawn.
   *
   *  - A logo is showing → the slot is it, and clicking replaces it.
   *  - No asset has ever been uploaded → the dashed placeholder invites one, and
   *    uploading turns the toggle on for this invoice.
   *  - An asset exists but the merchant switched it off → nothing. They made
   *    that choice on this invoice; re-offering the box here would read as the
   *    toggle not having worked.
   */
  const offerLogoSlot = !!model.logoUrl || !source.logoUrl;

  return (
    // `grid` on the clipping wrapper is load-bearing, not decoration. A4
    // proportions are a floor, so a near-empty draft still reads as a sheet of
    // paper — but a long invoice has to be able to push past them, and the
    // wrapper clips (it has to, for the rounded corners). A grid item's
    // automatic minimum size is content-based, so the sheet grows to fit and
    // nothing is cut off; the same box as a plain block child would overflow
    // straight into the clip.
    //
    // The layouts own their padding, because where the margin sits is part of
    // what distinguishes them — Bold Sidebar's rail runs to the paper's edge.
    <div className="grid overflow-hidden rounded-2xl border border-border bg-card shadow-md">
      {/* `min-w-0` is as load-bearing as the grid above. A grid item's default
          `min-width: auto` is a *min-content* minimum, so anything inside that
          refused to shrink — a nowrap-truncated item name, a fixed-track table —
          made the sheet itself wider than its column, and the wrapper's
          overflow-hidden then sliced the right-hand side off the page. Capping
          the item at its column is what keeps the paper the width of the paper. */}
      <div className="aspect-[210/297] min-w-0 bg-card">
        <Layout model={model} onLogoClick={offerLogoSlot ? onLogoClick : undefined} />
      </div>
    </div>
  );
}
