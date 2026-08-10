"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Field,
  FieldError,
  FieldLabel,
  Input,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  VisuallyHidden,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { useApp } from "@/stores/useApp";
import { CountryFlagAvatar } from "@/features/dashboard/multi-currency/components/CountryFlagAvatar";
import { VirtualAccountList } from "@/features/dashboard/multi-currency/components/VirtualAccountList";
import { VirtualAccountDetails } from "@/features/dashboard/multi-currency/components/VirtualAccountDetails";
import { TOOLTIP_CONTENT_CLASS } from "@/features/dashboard/multi-currency/constants";
import { buildShareUrl, currencyDisplayName } from "@/features/dashboard/multi-currency/utils";
import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(value: string, required: boolean): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return required ? "Enter an email address" : undefined;
  return EMAIL_RE.test(trimmed) ? undefined : "Enter a valid email address";
}

interface ShareAccountDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The account this modal was opened for — Share via link/email's header. */
  account: VirtualAccount;
  /** Every supported account, for the embedded preview's region selector. */
  accounts: VirtualAccount[];
  onCopyLink: (url: string) => void;
  onCopyFullAccount: (account: VirtualAccount) => void;
  onShareFullAccount: (account: VirtualAccount) => void;
}

/** Small header shared by both tabs: flag, a title, and the account name. */
function AccountSummary({ account, title }: { account: VirtualAccount; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <CountryFlagAvatar iso2={account.iso2} countryName={account.countryName} className="h-10 w-10" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{account.accountName}</p>
      </div>
    </div>
  );
}

export function ShareAccountDetailsModal({
  open,
  onOpenChange,
  account,
  accounts,
  onCopyLink,
  onCopyFullAccount,
  onShareFullAccount,
}: ShareAccountDetailsModalProps) {
  // Which account the embedded preview's region selector currently shows —
  // independent of the account the modal was opened for and of the real
  // page's own selection, so browsing regions here never changes what's
  // selected on the Multi Currency Accounts page underneath.
  const [previewAccountId, setPreviewAccountId] = useState(account.id);
  const previewAccount = accounts.find((a) => a.id === previewAccountId) ?? account;
  const shareUrl = buildShareUrl(account);

  const senderEmail = useApp((s) => s.profile?.emailId) ?? "you@company.com";

  // Both live above the Tabs, not inside either TabsContent, so switching
  // tabs — which only changes which panel renders — never resets them:
  // entered client/Cc/Bcc details and the Cc/Bcc toggle survive a trip back
  // to Share via link and forward again.
  const [showCcBcc, setShowCcBcc] = useState(false);
  const emailForm = useForm({
    defaultValues: { clientName: "", clientEmail: "", cc: "", bcc: "" },
    onSubmit: async ({ value }) => {
      if (validateEmail(value.clientEmail, true) || validateEmail(value.cc, false) || validateEmail(value.bcc, false)) {
        return;
      }
      // No email-send endpoint exists yet — mirrors Copy Link's own
      // client-side-only stand-in until a real one does.
      toast.success(`Account details sent to ${value.clientEmail}`);
      emailForm.reset();
      setShowCcBcc(false);
      onOpenChange(false);
    },
  });

  const [primaryIdentifier, secondaryIdentifier] = account.details;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setPreviewAccountId(account.id);
          emailForm.reset();
          setShowCcBcc(false);
        }
      }}
    >
      {/* pt-3 replaces the default pt-10 (reserved for the close button
          sitting below it, out of the flow): TabsList below is what now
          occupies that band, at the same top-3 offset as Close, so the two
          read as one header row instead of tabs getting their own row
          underneath it. */}
      <DialogContent className="max-w-[min(100%,64rem)] max-h-[min(90vh,760px)] pt-3">
        <DialogTitle asChild>
          <VisuallyHidden>Share account details</VisuallyHidden>
        </DialogTitle>

        <Tabs defaultValue="link">
          <TabsList className="mb-6">
            <TabsTrigger value="link">Share via link</TabsTrigger>
            <TabsTrigger value="email">Share via email</TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="mt-0 space-y-6">
            {/* Header: selected account on the left, the share link + Copy
                Link action on the right. flex-wrap drops the link block
                under the account summary on narrow viewports instead of
                squeezing either. */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <AccountSummary account={account} title="Copy account details" />
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:min-w-[380px] sm:flex-none">
                <Input readOnly value={shareUrl} className="min-w-0 text-xs" />
                <Button
                  variant="primary"
                  size="sm"
                  className="shrink-0"
                  leftIcon={<Icon name="copy" className="h-3.5 w-3.5" />}
                  onClick={() => onCopyLink(shareUrl)}
                >
                  Copy Link
                </Button>
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Preview</h3>
                  <p className="text-xs text-muted-foreground">This is what your clients will see.</p>
                </div>

                {/* Real public preview page doesn't exist yet — disabled
                    rather than linking somewhere that 404s. Wrapped in a
                    span so the tooltip still triggers on hover: a native
                    disabled button suppresses pointer events entirely. */}
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled
                          rightIcon={<Icon name="arrow-up-right" className="h-3.5 w-3.5" />}
                        >
                          Preview full page
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className={TOOLTIP_CONTENT_CLASS} sideOffset={4}>
                      Coming soon
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Embedded preview: a simulated rendering of the actual
                  customer-facing page, reusing the same carousel and Account
                  Details section the Multi Currency Accounts page itself
                  renders — verbatim, not reimplemented — rather than a
                  region-picker list plus a details panel side by side. */}
              <div className="mt-4 rounded-xl border border-border bg-muted/20 p-4">
                <h2 className="text-lg font-bold text-foreground">
                  Account details for payers in {previewAccount.countryName}
                </h2>

                <VirtualAccountList
                  accounts={accounts}
                  onCopy={onCopyFullAccount}
                  onShare={onShareFullAccount}
                  selectedAccountId={previewAccountId}
                  onSelect={(a) => setPreviewAccountId(a.id)}
                />

                {/* headerPlacement="inside" moves the flag/name/subtitle into
                    the card — this preview has no carousel-adjacent caption
                    naming the account the way the real page's "above"
                    placement assumes. showShare={false}: a customer
                    receiving these details has nothing of their own to
                    share, so Copy account details is the page's sole,
                    full-width action. */}
                <VirtualAccountDetails
                  account={previewAccount}
                  onCopy={onCopyFullAccount}
                  onShare={onShareFullAccount}
                  headerPlacement="inside"
                  showShare={false}
                  className="mt-4 w-full max-w-none"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="email" className="mt-0">
            {/* Fixed-width form column, flexible preview column — the same
                sidebar/content split mca-v2's own layout uses elsewhere in
                this feature. */}
            <div className="grid gap-6 sm:grid-cols-[280px_minmax(0,1fr)]">
              <div>
                <AccountSummary account={account} title="Send Account Details" />
                <Separator className="my-4" />

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void emailForm.handleSubmit();
                  }}
                  className="space-y-4"
                  noValidate
                >
                  <emailForm.Field name="clientName">
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor="clientName">Client Name</FieldLabel>
                        <Input
                          id="clientName"
                          placeholder="Enter client name"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </Field>
                    )}
                  </emailForm.Field>

                  <emailForm.Field
                    name="clientEmail"
                    validators={{ onBlur: ({ value }) => validateEmail(value, true) }}
                  >
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor="clientEmail">Client Email</FieldLabel>
                        <Input
                          id="clientEmail"
                          type="email"
                          placeholder="Enter client email"
                          aria-invalid={field.state.meta.errors.length > 0}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                        />
                        <FieldError>{field.state.meta.errors[0]}</FieldError>
                      </Field>
                    )}
                  </emailForm.Field>

                  {showCcBcc ? (
                    <div className="space-y-4">
                      <emailForm.Field
                        name="cc"
                        validators={{ onBlur: ({ value }) => validateEmail(value, false) }}
                      >
                        {(field) => (
                          <Field>
                            <FieldLabel htmlFor="cc">Cc</FieldLabel>
                            <Input
                              id="cc"
                              type="email"
                              placeholder="cc@company.com"
                              aria-invalid={field.state.meta.errors.length > 0}
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              onBlur={field.handleBlur}
                            />
                            <FieldError>{field.state.meta.errors[0]}</FieldError>
                          </Field>
                        )}
                      </emailForm.Field>
                      <emailForm.Field
                        name="bcc"
                        validators={{ onBlur: ({ value }) => validateEmail(value, false) }}
                      >
                        {(field) => (
                          <Field>
                            <FieldLabel htmlFor="bcc">Bcc</FieldLabel>
                            <Input
                              id="bcc"
                              type="email"
                              placeholder="bcc@company.com"
                              aria-invalid={field.state.meta.errors.length > 0}
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              onBlur={field.handleBlur}
                            />
                            <FieldError>{field.state.meta.errors[0]}</FieldError>
                          </Field>
                        )}
                      </emailForm.Field>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto px-0 text-muted-foreground"
                      leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
                      onClick={() => setShowCcBcc(true)}
                    >
                      Add Cc Bcc
                    </Button>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    leftIcon={<Icon name="send-horizontal" className="h-4 w-4" />}
                  >
                    Send Email
                  </Button>
                </form>
              </div>

              {/* Preview: a simulated rendering of the actual email the
                  client receives, using this account's real fields — not a
                  hand-authored mockup — so it can never drift from what
                  Send Email actually sends. */}
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <h3 className="text-lg font-bold text-foreground">Preview</h3>
                <p className="text-xs text-muted-foreground">This is what your clients will see</p>

                <div className="mt-4 space-y-4 rounded-lg border border-border bg-card p-5 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <p className="min-w-0 truncate">
                      <span className="font-semibold text-foreground">From: </span>
                      <span className="text-muted-foreground">{senderEmail}</span>
                    </p>
                    <p className="shrink-0 text-xs text-muted-foreground">Cc&nbsp;&nbsp;Bcc</p>
                  </div>
                  <Separator />
                  <p>
                    <span className="font-semibold text-foreground">Subject: </span>
                    <span className="text-foreground">New Bank Account Details for Payments</span>
                  </p>
                  <Separator />

                  <div className="space-y-3 text-muted-foreground">
                    <p>Dear Client,</p>
                    <p>Please find below our account details for your upcoming payment:</p>
                    <div>
                      <p>
                        Account Holder Name:{" "}
                        <span className="text-foreground">{account.accountHolderName}</span>
                      </p>
                      <p>
                        Bank Name: <span className="text-foreground">{account.bankName}</span>
                      </p>
                      <p>
                        Account Number / IBAN:{" "}
                        <span className="text-foreground">{primaryIdentifier?.value}</span>
                      </p>
                      <p>
                        Routing Code:{" "}
                        <span className="text-foreground">{secondaryIdentifier?.value}</span>
                      </p>
                      <p>
                        Currency:{" "}
                        <span className="text-foreground">{currencyDisplayName(account.currency)}</span>
                      </p>
                    </div>
                    <p>
                      Kindly use the above details to complete the transfer. Once the payment is
                      initiated, please share the transaction reference for our records.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
