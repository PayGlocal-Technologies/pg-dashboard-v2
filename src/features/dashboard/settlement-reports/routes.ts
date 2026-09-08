import type { NavContext } from "@/stores/useProductContext";

/**
 * Settlement reports render from one feature but live at two routes, one per
 * product, so the MCA nav tree links to its own path while the Home and
 * Payments trees keep the shared one. Both pages render the same components,
 * which pick their dataset off the active context (see useProductContext.ts),
 * so the only thing that differs is the URL the merchant sees and which
 * sidebar item highlights.
 */
export const SETTLEMENT_LIST_PATH = "/settlement-report";
export const MCA_SETTLEMENT_LIST_PATH = "/mca-settlement-report";

/** The list route matching the active context, used for row drill-down and
 * for the detail page's "Go back", so a merchant who arrived from the MCA
 * sidebar stays on the MCA route instead of being dropped onto the shared one. */
export function settlementListPath(context: NavContext): string {
  return context === "PACB" ? MCA_SETTLEMENT_LIST_PATH : SETTLEMENT_LIST_PATH;
}

/**
 * A settlement's detail route: `/…-settlement-report/{merchantId}/{date}`.
 *
 * Both halves of the key are path segments, mirroring the endpoint behind the
 * page. The merchant is required, not optional: an account settles at most once
 * a day, but a UCIC-scoped list spans MIDs, so the date alone does not identify
 * a settlement there, and the detail endpoint takes the merchant in its path.
 */
export function settlementDetailPath(
  context: NavContext,
  merchantId: string,
  settlementDate: string
): string {
  return (
    `${settlementListPath(context)}/${encodeURIComponent(merchantId)}` +
    `/${encodeURIComponent(settlementDate)}`
  );
}
