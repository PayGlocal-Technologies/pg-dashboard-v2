"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui";
import { CopyableText } from "@/components/common/CopyableText";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import { truncate, truncateMiddle } from "@/lib/utils/format";
import type { TxnAccountDetails } from "@/features/dashboard/mca-transactions/types";

/** Names run left to right with no meaningful tail, so they clip at the end.
 *  Sized to fit a two-column cell in the details drawer without wrapping. */
const NAME_MAX_LENGTH = 22;

/**
 * The virtual account the funds landed in, nested under the timeline's
 * "funds received" step. Collapsed to a one-line summary by default since
 * the full account block is reference detail, not something a merchant reads
 * on every visit.
 */
export function VirtualAccountRow({ accountDetails }: { accountDetails: TxnAccountDetails }) {
  const { accountHolderName, bankName, bankCountry, accountNumber, accountNumberType, currency } =
    accountDetails;

  if (!accountHolderName && !accountNumber && !currency && !bankCountry) return null;

  // Every value is elided to fit its grid cell rather than allowed to run
  // past it. CopyableText keeps the full string for the clipboard, the hover
  // title, and the copy tooltip, so nothing is actually lost by shortening
  // what's drawn.
  //
  // Which end gets dropped depends on what the value is for. An account
  // number or IBAN is verified rather than read: the leading characters name
  // the rail and bank, the trailing ones are what a merchant checks against
  // the copy they already hold, and only the middle is expendable — hence
  // truncateMiddle. A name reads left to right and has no meaningful tail, so
  // it truncates at the end instead.
  const fields = [
    accountHolderName && {
      label: "Account Holder Name",
      value: accountHolderName,
      display: truncate(accountHolderName, NAME_MAX_LENGTH),
      copyable: true,
    },
    accountNumber && {
      label: accountNumberType ? `Account Number (${accountNumberType})` : "Account Number",
      value: accountNumber,
      display: truncateMiddle(accountNumber, 10, 6),
      copyable: true,
    },
    currency && { label: "Currency", value: currency, display: currency, copyable: false },
    bankName && {
      label: "Bank Name",
      value: bankName,
      display: truncate(bankName, NAME_MAX_LENGTH),
      copyable: true,
    },
  ].filter(Boolean) as {
    label: string;
    value: string;
    display: string;
    copyable: boolean;
  }[];

  return (
    <Accordion type="single" collapsible className="mt-1">
      <AccordionItem value="virtual-account" className="border-none">
        <AccordionTrigger className="gap-2 py-1 text-[12px] hover:no-underline">
          <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
            {bankCountry && <CountryFlag iso2={bankCountry} />}
            <span className="truncate">
              Received in{" "}
              {accountHolderName && (
                <span className="font-medium text-foreground">{accountHolderName}</span>
              )}
              {accountNumber ? ` · ${truncateMiddle(accountNumber, 8, 4)}` : ""}
              {currency ? ` · ${currency}` : ""}
            </span>
          </span>
        </AccordionTrigger>
        <AccordionContent>
          {/* One column below sm so a narrow drawer gives each value the full
              width rather than eliding it twice as hard. min-w-0 on both the
              grid and each cell is what actually lets the children shrink:
              a grid item's default min-width is auto, which would otherwise
              let a long unbroken value push the column wider than its track. */}
          <div className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-3 rounded-lg bg-muted/40 px-3 py-2.5 sm:grid-cols-2">
            {fields.map(({ label, value, display, copyable }) => (
              <div key={label} className="min-w-0">
                <p className="text-[11px] text-muted-foreground">{label}</p>
                {copyable ? (
                  <CopyableText
                    value={value}
                    displayValue={display}
                    className="min-w-0"
                    valueClassName="min-w-0 truncate text-[12px]"
                  />
                ) : (
                  <p className="truncate text-[12px] font-medium text-foreground" title={value}>
                    {display}
                  </p>
                )}
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
