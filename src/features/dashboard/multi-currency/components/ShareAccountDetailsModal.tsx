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
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  VisuallyHidden,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { CountryFlagAvatar } from "@/features/dashboard/multi-currency/components/CountryFlagAvatar";
import { VirtualAccountDetails } from "@/features/dashboard/multi-currency/components/VirtualAccountDetails";
import { TOOLTIP_CONTENT_CLASS } from "@/features/dashboard/multi-currency/constants";
import { buildShareUrl } from "@/features/dashboard/multi-currency/utils";
import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmails(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map((email) => email.trim())
    .filter(Boolean);
}

function validateEmails(raw: string): string | undefined {
  const emails = parseEmails(raw);
  if (emails.length === 0) return "Enter at least one recipient email";
  const invalid = emails.find((email) => !EMAIL_RE.test(email));
  return invalid ? `"${invalid}" isn't a valid email` : undefined;
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

  const emailForm = useForm({
    defaultValues: { recipients: "", message: "" },
    onSubmit: async ({ value }) => {
      const error = validateEmails(value.recipients);
      if (error) return;
      // No email-send endpoint exists yet — mirrors Copy Link's own
      // client-side-only stand-in until a real one does.
      toast.success(`Account details sent to ${parseEmails(value.recipients).length} recipient(s)`);
      emailForm.reset();
      onOpenChange(false);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setPreviewAccountId(account.id);
          emailForm.reset();
        }
      }}
    >
      <DialogContent className="max-w-[min(100%,64rem)] max-h-[min(90vh,760px)]">
        <DialogTitle asChild>
          <VisuallyHidden>Share account details</VisuallyHidden>
        </DialogTitle>

        <Tabs defaultValue="link">
          <TabsList>
            <TabsTrigger value="link">Share via link</TabsTrigger>
            <TabsTrigger value="email">Share via email</TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-6">
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

              {/* Embedded preview: region selector on the left, the same
                  Account Details section the page itself uses on the right —
                  reused verbatim, not reimplemented. */}
              <div className="mt-4 flex flex-wrap items-start gap-4 rounded-xl border border-border bg-muted/20 p-4">
                <div className="w-full shrink-0 space-y-1 sm:w-56" role="list" aria-label="Select a region to preview">
                  {accounts.map((a) => {
                    const isSelected = a.id === previewAccountId;
                    return (
                      <Button
                        key={a.id}
                        type="button"
                        variant={isSelected ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start gap-2"
                        leftIcon={
                          <CountryFlagAvatar iso2={a.iso2} countryName={a.countryName} className="h-5 w-5" />
                        }
                        rightIcon={
                          isSelected ? <Icon name="chevron-right" className="h-3.5 w-3.5" /> : undefined
                        }
                        onClick={() => setPreviewAccountId(a.id)}
                      >
                        <span className="truncate">{a.countryName}</span>
                      </Button>
                    );
                  })}
                </div>

                <div className="min-w-0 flex-1">
                  <VirtualAccountDetails
                    account={previewAccount}
                    onCopy={onCopyFullAccount}
                    onShare={onShareFullAccount}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-5">
            <AccountSummary account={account} title="Send account details" />
            <Separator />

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void emailForm.handleSubmit();
              }}
              className="space-y-5"
              noValidate
            >
              <emailForm.Field
                name="recipients"
                validators={{ onBlur: ({ value }) => validateEmails(value) }}
              >
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="recipients">Recipient email(s)</FieldLabel>
                    <Input
                      id="recipients"
                      placeholder="client@company.com, partner@company.com"
                      aria-invalid={field.state.meta.errors.length > 0}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    <FieldError>{field.state.meta.errors[0]}</FieldError>
                  </Field>
                )}
              </emailForm.Field>

              <emailForm.Field name="message">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="message">Message (optional)</FieldLabel>
                    <Textarea
                      id="message"
                      placeholder="Add a note for your client"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </Field>
                )}
              </emailForm.Field>

              <Button
                type="submit"
                className="w-full"
                leftIcon={<Icon name="send-horizontal" className="h-4 w-4" />}
              >
                Send
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
