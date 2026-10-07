import { bankListApi } from "@/api";
import { useGet } from "@/lib/api/hooks";

export interface GlBankInfo {
  /** GL bank id, e.g. "GL_IN_1006". */
  id: string;
  bankName: string;
  /** "1" … "5" for the banks shown first at checkout, else null. */
  rank: string | null;
}

interface BankListResponse {
  data?: { glBankInfos?: GlBankInfo[] | null } | null;
}

const NO_BANKS: GlBankInfo[] = [];

/** The INB bank master, fetched once per session: it only changes when a bank
 *  is onboarded, so there is nothing to refetch. Empty while loading or if the
 *  call fails, which leaves every bank logo on its fallback icon. */
export function useBankList(): GlBankInfo[] {
  const { data } = useGet<BankListResponse>(["bank-list", "INB"], bankListApi, undefined, {
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
  return data?.data?.glBankInfos ?? NO_BANKS;
}
