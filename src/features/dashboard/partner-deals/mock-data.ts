import type { Deal } from "@/features/dashboard/partner-deals/types";

/**
 * DESIGN MOCK deals for the list. Placeholder codes (DEMO..., ONB-DEMO-...),
 * not real deals. TODO(integration): replace with the partner deals endpoint
 * once its contract is confirmed against pg-dashboard.
 */
export const MOCK_DEALS: Deal[] = [
  {
    dealId: "DEMO06",
    onboardingId: "ONB-DEMO-0106",
    status: "PENDING",
    createdAt: "26/09/2026 16:20:05",
  },
  {
    dealId: "DEMO05",
    onboardingId: "ONB-DEMO-0105",
    status: "ACTIVE",
    createdAt: "18/09/2026 11:02:44",
  },
  {
    dealId: "DEMO04",
    onboardingId: "ONB-DEMO-0104",
    status: "ACTIVE",
    createdAt: "02/09/2026 09:47:12",
  },
  {
    dealId: "DEMO03",
    onboardingId: "ONB-DEMO-0103",
    status: "INACTIVE",
    createdAt: "21/08/2026 18:15:30",
  },
  {
    dealId: "DEMO02",
    onboardingId: "ONB-DEMO-0102",
    status: "ACTIVE",
    createdAt: "07/08/2026 14:33:09",
  },
  {
    dealId: "DEMO01",
    onboardingId: "ONB-DEMO-0101",
    status: "INACTIVE",
    createdAt: "19/07/2026 10:05:51",
  },
];
