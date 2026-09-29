"use client";

import { useState } from "react";
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
  Shimmer,
} from "@/components/ui";
import { DisabledReason } from "@/components/common/DisabledReason";
import { useAppForm } from "@/components/form/AppForm";
import { check, required, rules } from "@/components/form/rules";
import { Icon } from "@/components/icon";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import {
  useAmzAccountStatement,
  useMerchantRegisteredProfile,
} from "@/features/dashboard/multi-currency/hooks";
import { merchantRegisteredAddressOf } from "@/features/dashboard/multi-currency/utils";
import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";
import { addressError, isValidEmail } from "@/features/dashboard/platforms/validation";

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
 * The country every merchant on this product is registered in. Fixed and
 * read-only, exactly as in pg-dashboard, which hardcodes `country: "INDIA"` as
 * a disabled field: PayGlocal onboards Indian entities, so an editable field
 * here would only invite a value the statement can't be issued for. Collected
 * for the merchant's own confirmation — the endpoint does not take it.
 */
const REGISTERED_COUNTRY = "INDIA";

/**
 * Account statement request form, in the same right-hand drawer the
 * Transaction Details and MCA Link Details experiences open in.
 *
 * Nothing here is a new component — it is flux-ui's Drawer, Field, Input,
 * Select, Textarea and Button arranged for this form, the way every other
 * drawer in the product is assembled.
 *
 * Field for field and payload field for payload field, this is pg-dashboard's
 * DownloadReport drawer (features/platform-withdrawals/PwDrawers). Three things
 * are worth knowing when reading it:
 *
 *  - The statement is issued to the *DBA* name, not the registered legal name.
 *    The legal name is shown read-only for confirmation and never sent, which
 *    is the opposite of what the field order suggests.
 *  - The contact email is part of the request, so it is required here even
 *    though nothing on screen depends on it.
 *  - Country is confirmation only, like the legal name.
 */
export function SettlementStatementDrawer({
  platformName,
  accounts,
  defaultAccountId,
  open,
  onOpenChange,
}: SettlementStatementDrawerProps) {
  // The currency drives the two account identifiers below it, so it is the
  // only account-derived field that needs to be controlled.
  const [accountId, setAccountId] = useState(defaultAccountId);
  const account = accounts.find((a) => a.id === accountId) ?? accounts[0] ?? null;

  const { profile, isLoading: isLoadingProfile } = useMerchantRegisteredProfile();

  // Closing on success rather than leaving the merchant looking at a form whose
  // work is done: the PDF has already opened in a new tab by this point.
  const { requestStatement, isWorking } = useAmzAccountStatement({
    onDownloaded: () => onOpenChange(false),
  });

  // details[0] is always the primary identifier (Account Number / IBAN / …)
  // and details[1] the routing-style one, the same order the account card and
  // Quick Access read them in.
  const [primaryIdentifier, routingIdentifier] = account?.details ?? [];

  const submit = (values: StatementFields) => {
    if (!account || isWorking) return;
    // Exactly the six fields pg-dashboard's DownloadReport sends — note
    // `merchantName` is the DBA name, not the registered legal name.
    void requestStatement({
      currency: account.currency,
      accountNumber: primaryIdentifier?.value ?? "",
      routingCode: routingIdentifier?.value ?? "",
      merchantName: values.dbaName.trim(),
      merchantRegisteredAddress: values.address.trim(),
      contactEmail: values.email.trim(),
    });
  };

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

        {isLoadingProfile || !account ? (
          // Three of these fields are prefilled from the profile, and a
          // blank editable "DBA name" reads as something to type — so the
          // form waits for the record rather than rendering half of it.
          <>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
              {isLoadingProfile && (
                <div className="space-y-5">
                  <Shimmer className="h-16 w-full" />
                  <Shimmer className="h-16 w-full" />
                  <Shimmer className="h-16 w-full" />
                  <Shimmer className="h-16 w-full" />
                  <Shimmer className="h-16 w-full" />
                </div>
              )}
            </div>
            <DrawerFooter>
              <DisabledReason reason="Loading your details…" className="w-full">
                <Button variant="primary" className="w-full" disabled>
                  Download
                </Button>
              </DisabledReason>
            </DrawerFooter>
          </>
        ) : (
          <StatementForm
            // Mounted once the profile has resolved, so its defaults are the
            // profile's values (no setState-in-effect to seed them).
            defaults={{
              dbaName: profile?.merchantShortName ?? "",
              email: "",
              address: merchantRegisteredAddressOf(profile),
            }}
            registeredName={profile?.merchantRegisteredName ?? ""}
            accounts={accounts}
            account={account}
            onAccountChange={setAccountId}
            primaryIdentifier={primaryIdentifier?.value ?? ""}
            routingIdentifier={routingIdentifier?.value ?? ""}
            isWorking={isWorking}
            onSubmit={submit}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

interface StatementFields {
  dbaName: string;
  email: string;
  address: string;
}

/** The statement form, mounted once the profile has loaded. Errors follow the
 *  app-wide rule (components/form): an edited field validates as it changes,
 *  Download validates the rest. */
function StatementForm({
  defaults,
  registeredName,
  accounts,
  account,
  onAccountChange,
  primaryIdentifier,
  routingIdentifier,
  isWorking,
  onSubmit,
}: {
  defaults: StatementFields;
  registeredName: string;
  accounts: VirtualAccount[];
  account: VirtualAccount;
  onAccountChange: (id: string) => void;
  primaryIdentifier: string;
  routingIdentifier: string;
  isWorking: boolean;
  onSubmit: (values: StatementFields) => void;
}) {
  const form = useAppForm({
    defaultValues: defaults,
    onSubmit: ({ value }) => onSubmit(value),
  });

  return (
    <form.AppForm>
      <form.Form className="flex min-h-0 flex-1 flex-col">
        {/* min-h-0 + flex-1 is what makes this the scrolling region rather than
            the drawer itself, so the Download footer stays put at the bottom
            however long the form runs. space-y-5 is the medium step between
            one field and the next. */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
          <Field>
            <FieldLabel htmlFor="settlement-currency">Currency</FieldLabel>
            <Select value={account.id} onValueChange={onAccountChange}>
              <SelectTrigger id="settlement-currency" className="w-full">
                <SelectValue placeholder="Select currency" />
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
                        <Icon name="globe" className="h-3.5 w-5 shrink-0 text-muted-foreground" />
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
              <Input id="settlement-account-number" value={primaryIdentifier} readOnly />
            </Field>

            <Field>
              <FieldLabel htmlFor="settlement-routing-code">Routing Code</FieldLabel>
              <Input id="settlement-routing-code" value={routingIdentifier} readOnly />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="settlement-legal-name">Seller legal name</FieldLabel>
            {/* The registered name on the merchant's own record, read-only
                as pg-dashboard has it: shown so the merchant can see which
                entity the request is made under, not sent with it. */}
            <Input
              id="settlement-legal-name"
              value={registeredName}
              placeholder="Enter seller legal name"
              readOnly
              disabled
            />
          </Field>

          {/* The trading name the statement is actually issued to — this
              is the `merchantName` the endpoint receives. Prefilled from
              the profile's short name and editable, since a seller's
              Amazon storefront name often isn't the registered one. */}
          <form.AppField
            name="dbaName"
            validators={{ onChange: rules(required("Seller DBA name")) }}
          >
            {(field) => (
              <field.TextField
                id="settlement-dba-name"
                label="Seller DBA name"
                placeholder="Enter seller name"
              />
            )}
          </form.AppField>

          {/* Part of the request, not a convenience: the statement is
              issued against this address. No default — the login email
              isn't necessarily the inbox that should receive it. */}
          <form.AppField
            name="email"
            validators={{
              onChange: rules(
                required("Seller account contact email"),
                check((value: string) => !isValidEmail(value) && "Invalid email address")
              ),
            }}
          >
            {(field) => (
              <field.TextField
                id="settlement-email"
                label="Seller account contact email"
                type="email"
                autoComplete="off"
                placeholder="Enter contact email"
              />
            )}
          </form.AppField>

          <Field>
            <FieldLabel htmlFor="settlement-country">Country</FieldLabel>
            <Input id="settlement-country" value={REGISTERED_COUNTRY} readOnly disabled />
          </Field>

          <form.AppField
            name="address"
            validators={{
              onChange: rules(
                required("Seller address"),
                check((value: string) => addressError(value))
              ),
            }}
          >
            {(field) => (
              <field.TextareaField
                id="settlement-address"
                label="Seller Address"
                placeholder="Enter seller address"
              />
            )}
          </form.AppField>
        </div>

        {/* DrawerFooter's own border-t and mt-auto make the section break
            between the form and its action, and pin the button to the bottom
            of the drawer without a run of empty space above it on a short
            form. Full width because it is the only action here. */}
        <DrawerFooter>
          {/* Generation is asynchronous — the request returns a timestamp and the
              PDF arrives seconds later — so the button stays disabled for the
              whole round trip rather than only the POST, and says which stage
              it is at. Missing fields never disable it: a press names them. */}
          <form.SubmitButton size="md" className="w-full" pending={isWorking}>
            {isWorking ? "Preparing statement…" : "Download"}
          </form.SubmitButton>
        </DrawerFooter>
      </form.Form>
    </form.AppForm>
  );
}
