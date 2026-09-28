/** Where a commission cycle's payout stands. */
export type CommissionStatus = "IN_PROGRESS" | "PROCESSING" | "RELEASED";

/**
 * One commission cycle for the partner. DESIGN MOCK shape, named for what the
 * table shows; map the real response onto it once the contract is confirmed
 * against pg-dashboard.
 */
export interface CommissionCycle {
  id: string;
  /** yyyy-mm-dd, inclusive. */
  periodStart: string;
  periodEnd: string;
  transactionCount: number;
  /** INR. */
  transactionAmount: number;
  /** INR. */
  commissionEarned: number;
  status: CommissionStatus;
}
