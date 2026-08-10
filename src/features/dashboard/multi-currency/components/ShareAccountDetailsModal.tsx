"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import {
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
  // useState's initializer only runs on first mount — if this modal instance
  // stays mounted across two different Share clicks (no key change on the
  // caller's side) with previewAccountId still pointing at whichever account
  // was previewed last time, the preview would keep showing that stale
  // account instead of the one this modal was just reopened for.
  //
  // Adjusted during render (not in an effect — see CLAUDE.md's purity rules
  // on synchronous setState in an effect body) via the React-documented
  // "store the last prop you rendered with, compare, and setState inline if
  // it changed" pattern: this re-render happens before the browser paints,
  // so there's no stale-preview flash the way an effect-based reset would
  // produce, and it's what keeps "the account selected in the Share modal"
  // and "the account the preview shows" from ever diverging regardless of
  // how the caller mounts this component.
  const [syncedAccountId, setSyncedAccountId] = useState(account.id);
  if (account.id !== syncedAccountId) {
    setSyncedAccountId(account.id);
    setPreviewAccountId(account.id);
  }
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

  // The white preview window stands in for the customer-facing page for one
  // payer country at a time — every other receiving account is irrelevant to
  // whichever customer would land on it, so only the currently previewed
  // account and the SWIFT catch-all (every other country's actual fallback)
  // show up here, not the full carousel the real page renders.
  const previewCards = accounts.filter((a) => a.id === previewAccountId || a.id === "row-swift");

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

                pb-3 (small) on top of the shared p-4 (rather than p-4 on every
                side) is the one place padding is intentionally asymmetric:
                the top/sides still give the Preview heading and its button
                room to breathe, but the bottom — measured from the white
                window's own edge to the grey surface's edge below it — stays
                noticeably tighter, which is what actually reads as "the white
                window sits inset in here" rather than "these two boxes happen
                to be near each other."

                max-h/overflow-hidden is what makes this a viewport rather
                than a plain wrapper: the white Card below is left to its own
                natural height (no cap, no scrollbar of its own), so on a
                tall account it genuinely extends past this box's fixed
                height — and this box's overflow-hidden is what cuts that
                overflow off cleanly at its own bottom edge, the same way a
                real browser viewport clips a page that's taller than the
                window rather than shrinking the page to fit. */}
            <div className="mt-8 max-h-[440px] overflow-hidden rounded-xl bg-muted/40 p-4 pb-3">
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

              {/* The actual white preview window — the same Card component
                  (border/rounded-xl/shadow-sm) used everywhere else in the
                  product, not a hand-styled substitute, so "a subtle,
                  Flux-compatible shadow/border" means literally reusing its
                  elevation rather than picking stronger new values. mt-4
                  (medium) is the "Preview heading → client preview" step —
                  closer than the large step above it, since both belong to
                  this one Preview section. No max-h/overflow of its own —
                  it renders at whatever height its content actually needs;
                  the grey box around it (above) is what clips it. */}
              <Card size="sm" className="mt-4">
                {/* The same muted, uppercase caption style
                    VirtualAccountDetails uses for its own "{Country} Account"
                    label elsewhere in this product — not the bold text-lg
                    heading this used before, which was reading as more
                    prominent than "Copy account details" above (a sm/
                    semibold label) despite this whole window being the
                    lowest-priority content in the modal. */}
                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Account details for payers in {previewAccount.countryName}
                </h2>

                {/* Only the account this preview represents, plus the SWIFT
                    catch-all every other payer country actually falls back
                    to — not the full 8-account carousel the real page
                    renders, which would name countries this simulated
                    customer was never going to pay from. */}
                <VirtualAccountList
                  accounts={previewCards}
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
                    full-width action. flagShape="circle": the same circular
                    treatment every other flag in the product uses — this
                    card's own default rectangular flag is specifically for
                    MCA v2's real Account Details card, not this preview. */}
                <VirtualAccountDetails
                  account={previewAccount}
                  onCopy={onCopyFullAccount}
                  onShare={onShareFullAccount}
                  headerPlacement="inside"
                  showShare={false}
                  flagShape="circle"
                  className="w-full max-w-none"
                />
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="email" className="mt-0">
            {/* Fixed-width form column, flexible preview column — the same
                sidebar/content split mca-v2's own layout uses elsewhere in
                this feature. 336px = 280px × 1.2 — a ~20% wider form column
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
                  <p>
                    <span className="font-semibold text-foreground">Subject: </span>
                    <span className="text-foreground">New Bank Account Details for Payments</span>
                  </p>
                  <Separator />

                  {/* space-y-2 (tight): the email body's own paragraph
                      rhythm — greeting, intro line, the metadata block, and
                      the closing note. */}
                  <div className="space-y-2 text-muted-foreground">
                    <p>Dear Client,</p>
                    <p>Please find below our account details for your upcoming payment:</p>
                    {/* space-y-1 (tight): consecutive metadata rows sit
                        close together — each row's own label → value is
                        already tight, being inline on one line. */}
                    <div className="space-y-1">
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
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
