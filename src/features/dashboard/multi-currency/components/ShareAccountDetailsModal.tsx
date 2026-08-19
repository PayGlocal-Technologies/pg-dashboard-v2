"use client";

import { useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
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
import { RegionSelector } from "@/features/dashboard/multi-currency/components/RegionSelector";
import { VirtualAccountDetails } from "@/features/dashboard/multi-currency/components/VirtualAccountDetails";
import { TOOLTIP_CONTENT_CLASS } from "@/features/dashboard/multi-currency/constants";
import {
  accountDocumentId,
  accountNumberOf,
  currencyDisplayName,
  splitAccountIdentifiers,
} from "@/features/dashboard/multi-currency/utils";
import { useSendAccountEmail, useShareLink } from "@/features/dashboard/multi-currency/hooks";
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
      <CountryFlagAvatar
        iso2={account.iso2}
        countryName={account.countryName}
        className="h-10 w-10"
      />
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
  // The link is issued by the backend per currency, so it can't be derived.
  //
  // Stored with the currency it was issued for, rather than as a bare string
  // that an effect clears when the account changes: that clear would be a
  // synchronous setState in an effect body, which the React Compiler lint
  // plugin rejects (see CLAUDE.md). Comparing instead means a link belonging
  // to a different currency is simply not shown, with no reset needed.
  const [issuedLink, setIssuedLink] = useState<{ currency: string; url: string } | null>(null);
  const shareUrl = issuedLink?.currency === account.currency ? issuedLink.url : "";

  const { requestShareLink, isRequesting } = useShareLink();
  const { sendAccountEmail, isSending } = useSendAccountEmail();

  // Requesting is a command, so it happens here rather than as a query keyed on
  // the modal being open. setState lands in the async callback, not this body.
  useEffect(() => {
    if (!open || !account.currency) return;
    if (issuedLink?.currency === account.currency) return;
    requestShareLink(account.currency, (url) => setIssuedLink({ currency: account.currency, url }));
  }, [open, account.currency, issuedLink, requestShareLink]);

  const senderEmail = useApp((s) => s.profile?.emailId) ?? "you@company.com";

  // Both live above the Tabs, not inside either TabsContent, so switching
  // tabs — which only changes which panel renders — never resets them:
  // entered client/Cc/Bcc details and the Cc/Bcc toggle survive a trip back
  // to Share via link and forward again.
  const [showCcBcc, setShowCcBcc] = useState(false);
  const emailForm = useForm({
    defaultValues: { clientName: "", clientEmail: "", cc: "", bcc: "" },
    onSubmit: async ({ value }) => {
      if (
        validateEmail(value.clientEmail, true) ||
        validateEmail(value.cc, false) ||
        validateEmail(value.bcc, false)
      ) {
        return;
      }
      // The endpoint identifies the account by the SHA-256 of its number, the
      // same hash pg-dashboard sends. Nothing here logs either value.
      const id = await accountDocumentId(accountNumberOf(account));
      if (!id) {
        toast.error("This account has no account number to share.");
        return;
      }

      // Cc/Bcc are omitted entirely when blank rather than sent as empty
      // arrays, matching pg-dashboard's payload.
      const cc = value.cc.trim();
      const bcc = value.bcc.trim();

      sendAccountEmail(
        {
          id,
          clientName: value.clientName,
          clientEmail: value.clientEmail,
          ...(cc ? { ccEmails: [cc] } : {}),
          ...(bcc ? { bccEmails: [bcc] } : {}),
        },
        () => {
          toast.success(`Account details sent to ${value.clientEmail}`);
          emailForm.reset();
          setShowCcBcc(false);
          onOpenChange(false);
        }
      );
    },
  });

  const { accountNumber, routingCode } = splitAccountIdentifiers(account);

  /**
   * One definition for both the preview below and whatever eventually sends
   * the mail, so the two can't drift. There's no send endpoint yet (the form's
   * onSubmit is a toast stand-in), but when there is, it takes this value.
   */
  const emailSubject = `Account details of ${account.accountHolderName}`;

  // The preview stands in for the customer-facing page for one payer country
  // at a time — every other receiving account is irrelevant to whichever
  // customer would land on it, so its region list carries only the account
  // this modal was opened for plus the SWIFT catch-all (every other country's
  // actual fallback), not the full set the real page renders. Filtering
  // `accounts` rather than building a pair by hand keeps Rest of the World in
  // its own list position, always below the selected region. Sharing Rest of
  // the World itself matches once, so the list is correctly one row long.
  const previewCards = accounts.filter((a) => a.id === account.id || a.isGlobal);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          emailForm.reset();
          setShowCcBcc(false);
        }
      }}
    >
      {/* p-6 replaces the default p-6 pt-10 (that extra top padding exists
          to reserve space for the close button sitting above the content,
          out of the flow) — p-6 alone is one consistent 24px on every side,
          with TabsList and Close now landing at the same offset a different
          way: [&>button:last-child]:top-6 moves the dialog's own built-in
          close button (its last rendered child, see flux-ui's dialog.tsx)
          down from its default top-3 to top-6, matching the content's own
          24px inset instead of the content moving up to match the button. */}
      <DialogContent className="max-w-[min(100%,64rem)] max-h-[min(90vh,760px)] p-6 [&>button:last-child]:top-6">
        <DialogTitle asChild>
          <VisuallyHidden>Share account details</VisuallyHidden>
        </DialogTitle>

        <Tabs defaultValue="link">
          {/* mb-4 (medium): tightened from mb-6 — this is the "tabs → first
              section" step, which should read as closer than the "large" step
              further down into Preview, not the same distance. */}
          <TabsList className="mb-4">
            <TabsTrigger value="link">Share via link</TabsTrigger>
            <TabsTrigger value="email">Share via email</TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="mt-0">
            {/* Account/link section, in its own Card — the strongest block in
                the modal: it's the only content sitting directly on the
                dialog's plain background (everything below lives inside the
                muted Preview surface), so its border/shadow reads as real
                elevation instead of competing with an equally-elevated
                neighbour. gap-2 (tight) between the account summary and the
                link pill — two halves of one block, not two separate ones —
                versus the large gap to Preview below. */}
            <Card size="sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <AccountSummary account={account} title="Copy account details" />

                {/* One shared grey pill rather than an Input and a Button that
                    merely sit beside each other: the Input loses its own
                    border/background (bg-transparent border-0 shadow-none) so
                    it reads as text sitting directly on the pill's surface, and
                    the pill's own p-1.5 is what gives Copy Link breathing room
                    from that surface's edge instead of the button floating
                    outside it as a separate action. */}
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-muted/40 p-1.5 sm:min-w-[380px] sm:flex-none">
                  <Input
                    readOnly
                    value={shareUrl}
                    className="min-w-0 border-0 bg-transparent text-xs shadow-none focus-visible:ring-0"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    className="shrink-0"
                    leftIcon={<Icon name="copy" className="h-3.5 w-3.5" />}
                    onClick={() => onCopyLink(shareUrl)}
                    // The link is issued by the backend, so there is nothing to
                    // copy until it arrives. Mirrors pg-dashboard, which also
                    // requests the link when the modal opens.
                    disabled={!shareUrl || isRequesting}
                  >
                    Copy Link
                  </Button>
                </div>
              </div>
            </Card>

            {/* mt-8 (large): the clearest step in the modal — this is where
                attention should visibly shift from "the thing being shared"
                to "a reference for what it looks like". The Card border above
                already marks that section's own edge, so no separate rule is
                needed here to double-mark the same boundary.

                The grey surface is what the client page's own white cards sit
                on, so it takes no height cap: the preview renders complete,
                down to the Copy button at the bottom of the account card. It
                used to clip at a fixed height to read as a browser viewport,
                which only made sense while the preview was a single white
                page inside it; cutting a two-card layout mid-button just
                looks broken. DialogContent already scrolls (overflow-y-auto)
                if the modal outgrows the screen. */}
            <div className="mt-8 rounded-xl bg-muted/40 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Preview</h3>
                  <p className="text-xs text-muted-foreground">
                    This is what your clients will see.
                  </p>
                </div>

                {/* Opens the real client-facing page — the same URL the Copy
                    Link field carries, so the merchant previews exactly what
                    they are about to send rather than a rendering of it.
                    Matches pg-dashboard's own handlePreviewFullPage.

                    Disabled only until the backend has issued that link, since
                    there is nothing to open before then. Wrapped in a span so
                    the tooltip still triggers while disabled: a native disabled
                    button suppresses pointer events entirely. */}
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!shareUrl || isRequesting}
                          onClick={() => window.open(shareUrl, "_blank", "noopener,noreferrer")}
                          rightIcon={<Icon name="arrow-up-right" className="h-3.5 w-3.5" />}
                        >
                          Preview full page
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className={TOOLTIP_CONTENT_CLASS} sideOffset={4}>
                      {shareUrl ? "Opens in a new tab" : "Preparing the link…"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* A picture of the client-facing page, not a working copy of
                  it. `inert` does the whole job in one attribute: it swallows
                  clicks, takes every control inside out of the tab order, and
                  hides them from the accessibility tree. All three matter
                  because these controls are otherwise real components — a
                  keyboard user would otherwise tab onto a Copy button that
                  belongs to a mock-up. The account this modal was opened for
                  is what it renders; there is nothing to select here, so it
                  holds no state of its own.

                  Two columns on the grey surface rather than one white
                  window: the region list and the account details are
                  separate white cards, which is how the real client page
                  lays them out. mt-4 (medium) is the "Preview heading →
                  client preview" step, closer than the large step above it
                  since both belong to this one Preview section. */}
              <div inert className="mt-4 select-none">
                <div className="grid gap-6 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Select Your Region</h3>

                    {/* Only the account this preview represents plus the
                        SWIFT catch-all every other payer country actually
                        falls back to — never the full set the real page
                        renders, which would name countries this simulated
                        customer was never going to pay from. */}
                    <Card size="sm" className="mt-3 gap-0 p-2">
                      <RegionSelector
                        accounts={previewCards}
                        selectedAccountId={account.id}
                        // Inert, so this can never fire — the region shown is
                        // fixed to the account being shared.
                        onSelect={() => {}}
                        label="Regions your client can pay from"
                      />
                    </Card>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Account details for payers in {account.countryName}
                    </h3>

                    {/* headerPlacement="inside" moves the flag/name/subtitle
                        into the card — this preview has no caption above it
                        naming the account the way the real page's "above"
                        placement assumes. showShare={false}: a customer
                        receiving these details has nothing of their own to
                        share, so Copy account details is the page's sole,
                        full-width action. */}
                    <VirtualAccountDetails
                      account={account}
                      onCopy={onCopyFullAccount}
                      onShare={onShareFullAccount}
                      headerPlacement="inside"
                      showShare={false}
                      className="mt-3 w-full max-w-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="email" className="mt-0">
            {/* Fixed-width form column, flexible preview column — the same
                sidebar/content split the Platforms page uses for its own
                list-beside-content layout. 336px = 280px × 1.2 — a ~20% wider form column
                (and so ~20% wider Client Name/Client Email inputs, both
                w-full within it) without touching the modal's own max-width;
                minmax(0,1fr) on the preview column absorbs the difference
                and still never overflows at any viewport width. gap-8
                (large) is the "left form → right preview" step — the same
                scale as the link tab's own large step between its two
                stacked sections. items-start keeps the left Card at its own
                natural height instead of stretching to match the (usually
                taller) preview column. */}
            <div className="grid gap-8 sm:grid-cols-[336px_minmax(0,1fr)] sm:items-start">
              {/* The form, in its own Card — the strongest, most prominent
                  block in this tab, same elevation treatment the link tab's
                  account/link Card gets: it's the only content sitting
                  directly on the dialog's plain background, so "account
                  being shared → form fields → Send Email" reads as one
                  cohesive group rather than three loose pieces. gap-0 hands
                  spacing control to the explicit margins below instead of
                  the Card's own default gap. */}
              <Card size="sm" className="gap-0">
                <AccountSummary account={account} title="Send Account Details" />
                {/* my-4 (medium) is "account block → divider" and "divider →
                    Client Name" at once — the same physical gap split evenly
                    above/below the rule itself. */}
                <Separator className="my-4" />

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void emailForm.handleSubmit();
                  }}
                  // space-y-4 (medium) is every "field → field" and "Cc/Bcc →
                  // Send Email" step at once — Client Name, Client Email, the
                  // Cc/Bcc toggle/fields, and Send Email are all direct
                  // children of this form.
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
                    // Same in-flight guard pg-dashboard's McaShareModal applies
                    // via isSendingEmail, so one submit can't be sent twice.
                    disabled={isSending}
                  >
                    Send Email
                  </Button>
                </form>
              </Card>

              {/* Preview: secondary, on the same muted grey surface (and the
                  same p-4/pb-3 asymmetric inset) the link tab's own Preview
                  container uses, so both tabs read "form/action is primary,
                  this grey surface is a supporting reference" the same way.
                  A simulated rendering of the actual email the client
                  receives, using this account's real fields — not a
                  hand-authored mockup — so it can never drift from what
                  Send Email actually sends. */}
              <div className="rounded-xl bg-muted/40 p-4 pb-3">
                <h3 className="text-sm font-semibold text-foreground">Preview</h3>
                <p className="text-xs text-muted-foreground">This is what your clients will see</p>

                {/* mt-4 (medium): "description → email preview" — matches
                    the link tab's own "Preview heading → client preview"
                    step. gap-4 keeps every row inside at the same medium
                    rhythm; the tighter groups below (metadata rows, body
                    paragraphs) override it locally with their own
                    space-y-1/space-y-2. */}
                <Card size="sm" className="mt-4 gap-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="min-w-0 truncate">
                      <span className="font-semibold text-foreground">From: </span>
                      <span className="text-muted-foreground">{senderEmail}</span>
                    </p>
                    <p className="shrink-0 text-xs text-muted-foreground">Cc&nbsp;&nbsp;Bcc</p>
                  </div>
                  <Separator />
                  <p className="min-w-0 truncate">
                    <span className="font-semibold text-foreground">Subject: </span>
                    <span className="text-foreground">{emailSubject}</span>
                  </p>
                  <Separator />

                  {/* The body is the one part of this preview that grows with
                      the account — a long bank name or address adds lines
                      nothing else here does. Capping it and scrolling keeps
                      From/Subject above pinned in place and, more importantly,
                      keeps the modal itself a fixed size: without this the
                      dialog's own overflow-y-auto would take over and the
                      whole modal would scroll instead. pr-1 keeps the
                      scrollbar off the text. */}
                  <div className="max-h-[280px] space-y-4 overflow-y-auto pr-1 text-muted-foreground">
                    {/* Live-bound to the Client Name field: typing a name in
                        the form updates the greeting here as the client will
                        actually see it. Empty until they do, which is exactly
                        what an unaddressed draft looks like. */}
                    <p>Hi {emailForm.state.values.clientName},</p>
                    <p>
                      Please find our bank account details for your upcoming payment below. You can
                      add our account as a beneficiary to your bank to initiate your payment with
                      us.
                    </p>
                    <p>Kindly use these details while initiating the transfer.</p>

                    {/* The details block sits on its own muted surface — the
                        same treatment the grey Preview surfaces around it use,
                        one step in. Labels carry the weight and values sit at
                        foreground colour, so a client scanning for a number
                        finds it. space-y-1 (tight): consecutive rows belong
                        together, and each row's own label → value is already
                        tight, being inline on one line. */}
                    <div className="space-y-1 rounded-lg bg-muted/50 p-4">
                      <p>
                        <span className="font-semibold text-foreground">Account Holder Name:</span>{" "}
                        {account.accountHolderName}
                      </p>
                      <p>
                        <span className="font-semibold text-foreground">Bank Name:</span>{" "}
                        {account.bankName}
                      </p>
                      <p>
                        <span className="font-semibold text-foreground">
                          Account Number / IBAN:
                        </span>{" "}
                        {accountNumber?.value}
                      </p>
                      <p>
                        <span className="font-semibold text-foreground">Routing Code:</span>{" "}
                        {routingCode?.value}
                      </p>
                      <p>
                        {/* Named, not the raw code: `currency` is "GLOBAL" for a
                            Rest of the World SWIFT account (see mapAccounts),
                            which means nothing to the client reading this
                            email. currencyDisplayName maps that to "Rest of
                            the World" and any ISO code to its full name. */}
                        <span className="font-semibold text-foreground">Currency:</span>{" "}
                        {currencyDisplayName(account.currency)}
                      </p>
                    </div>

                    {/* flux-ui's own warning Alert rather than a hand-tinted
                        box: this is a fraud warning, which is exactly what the
                        design system's warning semantic is for, and it keeps
                        the amber here identical to every other warning in the
                        product. */}
                    <Alert variant="warning">
                      <AlertDescription className="font-semibold text-foreground">
                        Important: Please note that our bank account details remain unchanged unless
                        officially communicated by us through verified channels
                      </AlertDescription>
                    </Alert>

                    {/* The email's last content, per the sign-off the account
                        holder sends under their own name. */}
                    <p>
                      Warm regards,
                      <br />
                      {account.accountHolderName}
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
