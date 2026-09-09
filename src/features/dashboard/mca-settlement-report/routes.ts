export const MCA_SETTLEMENT_LIST_PATH = "/mca-settlement-report";

/**
 * A settlement's detail route: `/mca-settlement-report/{merchantId}/{date}`.
 *
 * Both halves of the key are path segments, mirroring the endpoint behind the
 * page. The merchant is required, not optional: an account settles at most once
 * a day, but a UCIC-scoped list spans MIDs, so the date alone does not identify
 * a settlement there, and the detail endpoint takes the merchant in its path.
 */
export function mcaSettlementDetailPath(merchantId: string, settlementDate: string): string {
  return (
    `${MCA_SETTLEMENT_LIST_PATH}/${encodeURIComponent(merchantId)}` +
    `/${encodeURIComponent(settlementDate)}`
  );
}

/**
 * The list, with one settlement's drawer reopened.
 *
 * Collapse is the inverse of the drawer's Expand, but the two views live at
 * different routes here (unlike MCA transactions, where the page renders
 * inline), so the selection has to survive the navigation. It rides in the
 * query string, which the list reads once on mount.
 */
export function mcaSettlementListPathWithDrawer(
  merchantId: string,
  settlementDate: string
): string {
  const query = new URLSearchParams({ mid: merchantId, settlement: settlementDate });
  return `${MCA_SETTLEMENT_LIST_PATH}?${query.toString()}`;
}
