"use client";

import { MOCK_PORTFOLIO_MERCHANTS } from "@/features/dashboard/merchant-portfolio/mock-data";
import { portfolioMerchantById } from "@/features/dashboard/merchant-portfolio/derive";
import type { PortfolioMerchant } from "@/features/dashboard/merchant-portfolio/types";

/** MOCK data hooks, in the shape a real query would return.
 *  TODO(integration): the partner merchant-performance endpoints. */
export function usePortfolioMerchants(): {
  data: PortfolioMerchant[];
  isLoading: boolean;
  isError: boolean;
} {
  return { data: MOCK_PORTFOLIO_MERCHANTS, isLoading: false, isError: false };
}

export function usePortfolioMerchant(merchantId: string): {
  data: PortfolioMerchant | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  return { data: portfolioMerchantById(merchantId), isLoading: false, isError: false };
}
