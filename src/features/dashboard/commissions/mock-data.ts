import type { CommissionCycle } from "@/features/dashboard/commissions/types";

/**
 * DESIGN MOCK commission cycles, newest first: the current month still
 * accruing, last month's payout processing, everything older released.
 * Figures are illustrative, not derived from any real merchant.
 *
 * TODO(integration): replace with the partner commission endpoint once its
 * contract is confirmed against pg-dashboard.
 */
export const COMMISSION_CYCLES: CommissionCycle[] = [
  {
    id: "cyc-2026-09",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    transactionCount: 3,
    transactionAmount: 184250,
    commissionEarned: 460.63,
    status: "IN_PROGRESS",
  },
  {
    id: "cyc-2026-08",
    periodStart: "2026-08-01",
    periodEnd: "2026-08-31",
    transactionCount: 11,
    transactionAmount: 1248300,
    commissionEarned: 3120.75,
    status: "PROCESSING",
  },
  {
    id: "cyc-2026-07",
    periodStart: "2026-07-01",
    periodEnd: "2026-07-31",
    transactionCount: 8,
    transactionAmount: 962400,
    commissionEarned: 2406,
    status: "RELEASED",
  },
  {
    id: "cyc-2026-06",
    periodStart: "2026-06-01",
    periodEnd: "2026-06-30",
    transactionCount: 5,
    transactionAmount: 752400,
    commissionEarned: 1881,
    status: "RELEASED",
  },
  {
    id: "cyc-2026-05",
    periodStart: "2026-05-01",
    periodEnd: "2026-05-31",
    transactionCount: 7,
    transactionAmount: 610750,
    commissionEarned: 1526.88,
    status: "RELEASED",
  },
  {
    id: "cyc-2026-04",
    periodStart: "2026-04-01",
    periodEnd: "2026-04-30",
    transactionCount: 4,
    transactionAmount: 398200,
    commissionEarned: 995.5,
    status: "RELEASED",
  },
  {
    id: "cyc-2026-03",
    periodStart: "2026-03-01",
    periodEnd: "2026-03-31",
    transactionCount: 6,
    transactionAmount: 541900,
    commissionEarned: 1354.75,
    status: "RELEASED",
  },
  {
    id: "cyc-2026-02",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    transactionCount: 2,
    transactionAmount: 126000,
    commissionEarned: 315,
    status: "RELEASED",
  },
];
