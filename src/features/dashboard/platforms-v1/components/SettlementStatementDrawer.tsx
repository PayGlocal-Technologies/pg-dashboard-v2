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
  FieldLabel,
  IconButton,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

interface SettlementStatementDrawerProps {
  /** Names the report, e.g. "Amazon settlement statement report". */
  platformName: string;
  /** Receiving accounts the platform can pay into — the currency options. */
  accounts: VirtualAccount[];
  /** Currency the form opens on: whichever account the page is showing. */
  defaultAccountId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Settlement statement request form, in the same right-hand drawer the
 * Transaction Details and MCA Link Details experiences open in.
 *
 * Nothing here is a new component — it is flux-ui's Drawer, Field, Input,
 * Select, Textarea and Button arranged for this form, the way every other
 * drawer in the product is assembled.
 *
 * There is no settlement-statement endpoint yet, so Download is a placeholder
 * (the same stand-in treatment the document rows and MCA v2's proof-of-account
 * download use). Wire it to the real endpoint once the contract exists — per
 * CLAUDE.md, confirm the path and payload against pg-dashboard rather than
 * inferring them.
 */
export function SettlementStatementDrawer({
  platformName,
  accounts,
  defaultAccountId,
  open,
  onOpenChange,
}: SettlementStatementDrawerProps) {
  // The currency drives the two account identifiers below it, so it is the
  // only field that needs to be controlled — the rest are plain uncontrolled
  // inputs with a defaultValue, which is also what keeps a half-typed address
  // from being wiped when the currency changes.
  const [accountId, setAccountId] = useState(defaultAccountId);
  const account = accounts.find((a) => a.id === accountId) ?? accounts[0] ?? null;

  // details[0] is always the primary identifier (Account Number / IBAN / …)
  // and details[1] the routing-style one, the same order the account card and
  // Quick Access read them in.
  const [primaryIdentifier, routingIdentifier] = account?.details ?? [];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {/* Same width and the same suppression of DrawerContent's built-in
          top-right close button as the Transaction Details and MCA Link
          drawers, so every drawer in the product opens identically. The
          suppression is what lets the header below own the close affordance
          rather than showing two X's. */}
      <DrawerContent className="w-full sm:w-[32rem] sm:max-w-[92vw] [&>button:last-child]:hidden">
        {/* Title left, close right. No back arrow: the drawer is a layer over
            the page, not a route, so closing it is the only way out and the
            page behind is untouched. */}
        <DrawerHeader className="flex shrink-0 items-start justify-between gap-4">
          <DrawerTitle className="pr-0 text-lg">
            {platformName} settlement statement report
          </DrawerTitle>
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

        {/* min-h-0 + flex-1 is what makes this the scrolling region rather than
            the drawer itself, so the Download footer stays put at the bottom
            however long the form runs. space-y-5 is the medium step between
            one field and the next. */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
          {account && (
            <>
              <Field>
                <FieldLabel htmlFor="settlement-currency">Currency</FieldLabel>
                <Select value={account.id} onValueChange={setAccountId}>
                  <SelectTrigger id="settlement-currency" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        <span className="flex items-center gap-2">
                          {/* A SWIFT-rail catch-all account has no single
                              country behind it, so it shows a globe instead of
                              a flag — the same fallback the page's own currency
                              select uses. */}
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

              {/* The two identifiers of the account named above, side by side
                  from `sm` up: they are one fact about one account, so they are
                  grouped closer to each other (16px) than to the fields around
                  them (20px). Read-only — they are what the selected currency
                  resolves to, not something to retype, and editing them here
                  would only produce a statement for an account that isn't
                  yours. */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="settlement-account-number">Account Number</FieldLabel>
                  <Input
                    id="settlement-account-number"
                    value={primaryIdentifier?.value ?? ""}
                    readOnly
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="settlement-routing-code">Routing Code</FieldLabel>
                  <Input
                    id="settlement-routing-code"
                    value={routingIdentifier?.value ?? ""}
                    readOnly
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="settlement-legal-name">Seller Legal Name</FieldLabel>
                {/* Prefilled from the account rather than typed again — it is
                    the same holder the account details show. Editable, since
                    the name on a platform account can differ from the one on
                    the bank account. */}
                <Input
                  id="settlement-legal-name"
                  defaultValue={account.accountHolderName}
                  placeholder="Enter Seller Legal Name"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="settlement-dba-name">Seller DBA Name</FieldLabel>
                <Input id="settlement-dba-name" placeholder="Enter Seller DBA Name" />
              </Field>

              <Field>
                <FieldLabel htmlFor="settlement-country">Country</FieldLabel>
                <Input id="settlement-country" placeholder="Enter Country" />
              </Field>

              <Field>
                <FieldLabel htmlFor="settlement-address">Seller Address</FieldLabel>
                <Textarea id="settlement-address" placeholder="Enter Seller Address" />
              </Field>
            </>
          )}
        </div>

        {/* DrawerFooter's own border-t and mt-auto make the section break
            between the form and its action, and pin the button to the bottom
            of the drawer without a run of empty space above it on a short
            form. Full width because it is the only action here. */}
        <DrawerFooter>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => toast.info("Settlement statements will be available soon")}
          >
            Download
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
