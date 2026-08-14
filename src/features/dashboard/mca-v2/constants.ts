import { MOCK_VIRTUAL_ACCOUNTS } from "@/features/dashboard/multi-currency/mock-data";
import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

/**
 * The six client regions MCA v2 offers, in display order.
 *
 * Deliberately a subset of MOCK_VIRTUAL_ACCOUNTS (which also carries the UAE
 * and Singapore accounts the Virtual Accounts page shows): v2's region list is
 * a fixed, ordered list rather than "whatever accounts exist", so it's spelled
 * out here by id instead of derived. Swap this for the real accounts endpoint's
 * ordering once it exists — everything downstream reads from MCA_V2_REGIONS,
 * not from the mock module.
 */
const MCA_V2_REGION_IDS = ["us-usd", "gb-gbp", "eu-eur", "au-aud", "ca-cad", "row-swift"] as const;

export const MCA_V2_REGIONS: VirtualAccount[] = MCA_V2_REGION_IDS.map((id) =>
  MOCK_VIRTUAL_ACCOUNTS.find((account) => account.id === id)!
).filter(Boolean);

/**
 * Last-resort currency for the settled-amount card, used only if a region ever
 * carries one the summary data has no entry for. The card's actual currency
 * comes from the selected region.
 */
export const DEFAULT_SETTLED_CURRENCY = "USD";
