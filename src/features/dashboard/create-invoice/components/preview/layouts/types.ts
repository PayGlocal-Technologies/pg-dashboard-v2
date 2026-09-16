import type { PreviewModel } from "@/features/dashboard/create-invoice/components/preview/previewModel";

/**
 * Every layout takes exactly this and nothing else.
 *
 * A layout is presentational: it receives a fully derived model and decides
 * where things sit. Keeping the signature identical across all six is what lets
 * InvoiceDocumentPreview pick one from a map rather than branching, and what
 * makes adding a seventh a single file.
 */
export interface LayoutProps {
  model: PreviewModel;
  /** Opens the logo dialog. Absent in read-only contexts, which hide the slot. */
  onLogoClick?: () => void;
}
