"use client";

import { useMemo } from "react";
import { useGet } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import { mcaVirtualAccountsApi } from "@/features/dashboard/multi-currency/services";
import { toViewAccounts } from "@/features/dashboard/multi-currency/mapAccounts";
import type { AccountDataResponse } from "@/features/dashboard/multi-currency/types";
import { useBankHolidayMonths } from "@/features/dashboard/mca-settlement-report/hooks";
import { suggestedAccountsByCurrencyApi } from "@/features/dashboard/mca-transactions/services";
import type { SuggestedAccountsByCurrencyResponse } from "@/features/dashboard/mca-transactions/types";
import {
  isEtaCurrency,
  type EtaCurrency,
} from "@/features/dashboard/mca-transactions/payment-eta/constants";

/**
 * The MID both reads below address: the selected MID, else the first PACB MID.
 * Not useScopeId's id, which for a multi-MID merchant with nothing selected is
 * the UCIC roll-up: the suggested-account endpoint takes a merchant id only.
 */
function useEtaMerchantId(): string {
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);
  const firstPacbMid = useApp((s) => s.paCbMids[0]) ?? "";
  return selectedMid || firstPacbMid;
}

export interface EtaCurrencyOption {
  code: EtaCurrency;
  /** Drives the flag. */
  iso2: string;
}

/**
 * The currencies the merchant actually holds a receiving account in, from the
 * virtual-accounts read's `general` set (the merchant's own accounts; `amazon`
 * is Amazon payouts, not client payments). Limited to currencies the ETA check
 * has rail timings for, so the SWIFT catch-all and any currency without a rail
 * table (AED, SGD) aren't offered.
 */
export function useEtaCurrencies(): {
  currencies: EtaCurrencyOption[];
  isLoading: boolean;
  isError: boolean;
} {
  const merchantId = useEtaMerchantId();
  const isGuestUser = useApp((s) => s.isGuestUser);
  const enabled = !!merchantId && isGuestUser === false;
  // Same key shape as useVirtualAccounts, so this shares that cache whenever
  // both resolve to the same MID.
  const { data, isPending, isError } = useGet<AccountDataResponse>(
    ["mca-virtual-accounts", merchantId],
    mcaVirtualAccountsApi(merchantId),
    { enabled }
  );

  const currencies = useMemo(() => {
    const seen = new Set<string>();
    const options: EtaCurrencyOption[] = [];
    for (const account of toViewAccounts(data?.data?.general)) {
      if (account.isGlobal || !isEtaCurrency(account.currency) || seen.has(account.currency)) {
        continue;
      }
      seen.add(account.currency);
      options.push({ code: account.currency, iso2: account.iso2 });
    }
    return options;
  }, [data]);

  return { currencies, isLoading: enabled && isPending, isError };
}

export interface EtaAccount {
  id: string;
  bankName: string;
  /** e.g. "USD virtual account". */
  accountType: string;
  /** Last four digits only, e.g. "XXXX 1234". The full number never renders. */
  maskedNumber: string;
}

function accountTypeLabel(currency: string, accountNumberType: string): string {
  const type = accountNumberType.trim().toLowerCase().replace(/_/g, " ");
  return [currency, type, "account"].filter(Boolean).join(" ");
}

function lastFour(accountNumber: string): string {
  const digits = accountNumber.replace(/\s/g, "");
  return digits ? `XXXX ${digits.slice(-4)}` : "";
}

/**
 * The accounts the merchant could have shared for a currency, from
 * GET /mca-invoice/{mid}/get-suggested-account-by-currency. Off until a
 * currency is picked. Keyed by MID and currency, so the form and the result
 * read the same cached list.
 */
export function useEtaAccounts(currency: EtaCurrency | ""): {
  accounts: EtaAccount[];
  isLoading: boolean;
  isError: boolean;
} {
  const merchantId = useEtaMerchantId();
  const enabled = !!merchantId && !!currency;
  const { data, isPending, isError } = useGet<SuggestedAccountsByCurrencyResponse>(
    ["eta-suggested-accounts", merchantId, currency],
    suggestedAccountsByCurrencyApi(merchantId, currency),
    { enabled }
  );

  const accounts = useMemo(
    () =>
      (data?.data?.suggestedAccounts ?? [])
        .filter((a) => !!a?.accountId)
        .map((a) => ({
          id: a.accountId,
          bankName: a.bankName || "Bank account",
          accountType: accountTypeLabel(a.currency || currency, a.accountNumberType || ""),
          maskedNumber: lastFour(a.accountNumber || ""),
        })),
    [data, currency]
  );

  return { accounts, isLoading: enabled && isPending, isError };
}

/**
 * The payment currency's bank holidays around the day it was sent, from the
 * live calendar (GET /gcc/v1/calendar): the same read the settlement calendar
 * uses, and the same handling as production's BankHolidayCalendar, every
 * country's list merged and the entries kept by their `currency` field (this
 * currency instead of INR).
 *
 * The longest walk (Bacs: 3 business days, plus a weekend and a holiday or
 * two) stays well inside two weeks, so the sent month and the one after it
 * always cover it. The calendar answers one month per request; each month is
 * cached and shared with the settlement screens.
 */
export function useEtaHolidays(
  currency: EtaCurrency,
  initiatedDate: string
): { holidays: { date: string; name: string }[]; isLoading: boolean; isError: boolean } {
  // Only called from the result step, which etaBlocker guarantees has both a
  // currency and a sent date.
  return useBankHolidayMonths(initiatedDate, 2, currency);
}
