"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Field,
  FieldError,
  FieldLabel,
  IconButton,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Shimmer,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import {
  useMerchantRegisteredProfile,
  useTransactionReportDownload,
} from "@/features/dashboard/multi-currency/hooks";
import {
  accountDocumentId,
  accountNumberOf,
  merchantRegisteredAddressOf,
} from "@/features/dashboard/multi-currency/utils";
import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";
import { addressError, isValidEmail, nameError } from "@/features/dashboard/platforms/validation";

interface TransactionReportDrawerProps {
  /** Receiving accounts the report can be pulled for — the currency options. */
  accounts: VirtualAccount[];
  /** Currency the form opens on: whichever account the page is showing. */
  defaultAccountId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Transaction report request form — the last three months of activity on one
 * receiving account.
 *
 * This used to be a straight download from the document card. pg-dashboard now
 * asks for the merchant's registered details and a contact email first and
 * POSTs them as the body of the bank-statement call (its
 * PwDrawers/TransactionReportDrawer), so the card opens this drawer instead.
 * The three fields here are exactly the ones that request takes.
 *
 * Nothing here is a new component — flux-ui's Drawer, Field, Input, Select and
 * Button, assembled the way the settlement statement drawer beside it is.
 */
export function TransactionReportDrawer({
  accounts,
  defaultAccountId,
  open,
  onOpenChange,
}: TransactionReportDrawerProps) {
  const [accountId, setAccountId] = useState(defaultAccountId);
  const account = accounts.find((a) => a.id === accountId) ?? accounts[0] ?? null;

  const { profile, isLoading: isLoadingProfile } = useMerchantRegisteredProfile();
  const { downloadReport, isDownloading } = useTransactionReportDownload();

  // Both prefilled fields are editable — pg-dashboard disables the name, but a
  // merchant whose profile carries an outdated or truncated registered name
  // would otherwise have no way to get a usable statement, and the name is part
  // of the request rather than a lookup key. Held as *overrides* rather than
  // seeded state, so they follow the profile as it resolves without a setState
  // in an effect (which CLAUDE.md rules out). Null means "not edited".
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [addressOverride, setAddressOverride] = useState<string | null>(null);
  const registeredName = nameOverride ?? profile?.merchantRegisteredName ?? "";
  const address = addressOverride ?? merchantRegisteredAddressOf(profile);

  const [email, setEmail] = useState("");

  // Errors surface on blur, not on every keystroke, matching pg-dashboard's
  // validateTrigger="onBlur".
  const [nameTouched, setNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [addressTouched, setAddressTouched] = useState(false);

  const nameMessage = nameError(registeredName);
  const emailError = email.trim() && !isValidEmail(email) ? "Invalid email address" : "";
  const addressMessage = addressError(address);

  const canSubmit =
    !!account &&
    !!registeredName.trim() &&
    !nameMessage &&
    isValidEmail(email) &&
    !!address.trim() &&
    !addressMessage &&
    !isDownloading;

  const submit = async () => {
    if (!account || !canSubmit) return;

    // The endpoint keys the account by the SHA-256 of its number, never the
    // number itself. Neither value is logged.
    const documentId = await accountDocumentId(accountNumberOf(account));
    if (!documentId) {
      toast.error("This account has no account number to generate a report for.");
      return;
    }

    try {
      await downloadReport(
        {
          merchantRegisteredName: registeredName.trim(),
          contactEmail: email.trim(),
          merchantRegisteredAddress: address.trim(),
        },
        documentId
      );
      onOpenChange(false);
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message || "Couldn't download this report.");
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {/* Same width and the same suppression of DrawerContent's built-in
          top-right close button as every other drawer in the product, so they
          all open identically. */}
      <DrawerContent className="w-full sm:w-[32rem] sm:max-w-[92vw] [&>button:last-child]:hidden">
        <DrawerHeader className="flex shrink-0 items-start justify-between gap-4">
          <DrawerTitle className="pr-0 text-lg">Transaction report</DrawerTitle>
          <IconButton
            aria-label="Close"
            variant="ghost"
            size="sm"
            className="-mr-2 -mt-1 shrink-0"
            onClick={() => onOpenChange(false)}
          >
            <Icon name="x" className="h-4 w-4" />
          </IconButton>
        </DrawerHeader>

        {/* min-h-0 + flex-1 makes this the scrolling region rather than the
            drawer itself, so the Download footer stays put however long the
            form runs. space-y-5 is the field → field step. */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
          {isLoadingProfile ? (
            // The two prefilled fields have no meaningful empty state — an
            // enabled, blank "registered name" reads as something to type — so
            // the form waits for the profile rather than rendering half of it.
            <div className="space-y-5">
              <Shimmer className="h-16 w-full" />
              <Shimmer className="h-16 w-full" />
              <Shimmer className="h-16 w-full" />
              <Shimmer className="h-16 w-full" />
            </div>
          ) : (
            account && (
              <>
                <Field>
                  <FieldLabel htmlFor="transaction-report-currency">Currency</FieldLabel>
                  <Select value={account.id} onValueChange={setAccountId}>
                    <SelectTrigger id="transaction-report-currency" className="w-full">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          <span className="flex items-center gap-2">
                            {/* A SWIFT-rail catch-all account has no single
                                country behind it, so it shows a globe instead
                                of a flag — the same fallback the page's own
                                currency select uses. */}
                            {option.iso2 === "ROW" ? (
                              <Icon
                                name="globe"
                                className="h-3.5 w-5 shrink-0 text-muted-foreground"
                              />
                            ) : (
                              <CountryFlag iso2={option.iso2} />
                            )}
                            {option.currency}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="transaction-report-name">
                    Merchant registered name
                  </FieldLabel>
                  {/* Prefilled from the merchant's own record and editable: it
                      is sent with the request, so the statement is issued in
                      whatever name is here. */}
                  <Input
                    id="transaction-report-name"
                    value={registeredName}
                    placeholder="Enter merchant registered name"
                    aria-invalid={nameTouched && !!nameMessage}
                    onChange={(e) => setNameOverride(e.target.value)}
                    onBlur={() => setNameTouched(true)}
                  />
                  {nameTouched && nameMessage && <FieldError>{nameMessage}</FieldError>}
                </Field>

                <Field>
                  <FieldLabel htmlFor="transaction-report-email">Contact email</FieldLabel>
                  {/* Where the report is sent if generation outlives the
                      session, so it is the one field with no sensible default —
                      the merchant's own login address is not necessarily the
                      inbox that wants a statement. */}
                  <Input
                    id="transaction-report-email"
                    type="email"
                    autoComplete="off"
                    value={email}
                    placeholder="Enter contact email"
                    aria-invalid={emailTouched && !!emailError}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setEmailTouched(true)}
                  />
                  {emailTouched && emailError && <FieldError>{emailError}</FieldError>}
                </Field>

                <Field>
                  <FieldLabel htmlFor="transaction-report-address">
                    Merchant registered address
                  </FieldLabel>
                  <Input
                    id="transaction-report-address"
                    value={address}
                    placeholder="Enter merchant registered address"
                    aria-invalid={addressTouched && !!addressMessage}
                    onChange={(e) => setAddressOverride(e.target.value)}
                    onBlur={() => setAddressTouched(true)}
                  />
                  {addressTouched && addressMessage && <FieldError>{addressMessage}</FieldError>}
                </Field>
              </>
            )
          )}
        </div>

        {/* DrawerFooter's own border-t and mt-auto make the break between the
            form and its action, and pin the button to the bottom without a run
            of empty space above it on a short form. */}
        <DrawerFooter>
          {/* Generation is asynchronous — leg 1 returns a descriptor and the PDF
              arrives seconds later — so the button stays disabled for the whole
              round trip rather than only the POST, and says which stage it is
              at. */}
          <Button
            variant="primary"
            className="w-full"
            disabled={!canSubmit}
            onClick={() => void submit()}
          >
            {isDownloading ? "Preparing report…" : "Download"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
