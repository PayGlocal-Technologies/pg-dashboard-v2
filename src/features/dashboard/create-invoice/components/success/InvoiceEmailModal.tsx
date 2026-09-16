"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Field,
  FieldDescription,
  FieldLabel,
  Shimmer,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { useGet, usePost } from "@/lib/api/hooks";
import {
  getClientByIdApi,
  getInvoiceDetailsApi,
  sendInvoiceEmailApi,
} from "@/features/dashboard/create-invoice/services";
import { useInvoiceMerchantId } from "@/features/dashboard/create-invoice/hooks";
import { EmailRecipientsInput } from "@/features/dashboard/create-invoice/components/success/EmailRecipientsInput";
import { EmailPreview } from "@/features/dashboard/create-invoice/components/success/EmailPreview";
import type {
  ClientQueryResponse,
  InvoiceDetailsResponse,
} from "@/features/dashboard/create-invoice/types";
import type { BaseResponse } from "@/types/common";

interface SendEmailRequest {
  receiverEmails: string[];
  receiverCcEmails?: string[];
  receiverBccEmails?: string[];
}

/**
 * Send the generated invoice to the client.
 *
 * A modal, and two-pane: the compose form on the left, the Client's View
 * preview on the right, collapsing to form-only below lg exactly as
 * pg-dashboard's drawer does at that width.
 *
 * The invoice is fetched here rather than passed in, so both call sites (the
 * create flow's success screen and the invoice details page) stay simple and
 * the preview always has the full record it needs: the biller's legal name, the
 * totals, the dates and the payee account.
 *
 * Field names on the send payload match production's exactly.
 */
export function InvoiceEmailModal({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  clientId,
  clientName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
}) {
  const merchantId = useInvoiceMerchantId();

  const clientUrl = getClientByIdApi(merchantId, clientId);
  const { data: clientData, isLoading: loadingClient } = useGet<ClientQueryResponse>(
    ["mca-client", merchantId, clientId],
    clientUrl,
    undefined,
    { enabled: open && !!clientUrl }
  );

  const invoiceUrl = getInvoiceDetailsApi(merchantId, invoiceId);
  const { data: invoiceData } = useGet<InvoiceDetailsResponse>(
    ["invoice-details", merchantId, invoiceId],
    invoiceUrl,
    undefined,
    { enabled: open && !!invoiceUrl }
  );

  const clientEmail = clientData?.data?.client?.email;
  const invoice = invoiceData?.data?.invoice;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-h-[52rem] w-[95vw] max-w-5xl flex-col overflow-hidden p-0">
        <DialogTitle className="shrink-0 border-b border-border px-5 py-4 text-[16px] font-semibold">
          Email invoice {invoiceNumber}
        </DialogTitle>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
          {loadingClient ? (
            <div className="space-y-3 p-5">
              <Shimmer className="h-10 w-full" />
              <Shimmer className="h-24 w-full" />
            </div>
          ) : (
            <EmailComposer
              // Remount once the client's address is known so the To field can
              // seed from a useState initializer rather than an effect.
              key={clientEmail ?? "no-client-email"}
              merchantId={merchantId}
              invoiceId={invoiceId}
              clientName={clientName}
              clientEmail={clientEmail}
              onClose={() => onOpenChange(false)}
            />
          )}

          {/* Below lg the preview would push the form off-screen, so it is
              dropped rather than stacked, matching production's breakpoint. */}
          <div className="hidden min-h-0 border-l border-border lg:block">
            <EmailPreview invoice={invoice} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmailComposer({
  merchantId,
  invoiceId,
  clientName,
  clientEmail,
  onClose,
}: {
  merchantId: string;
  invoiceId: string;
  clientName: string;
  clientEmail: string | undefined;
  onClose: () => void;
}) {
  const [to, setTo] = useState<string[]>(() => (clientEmail ? [clientEmail] : []));
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [testTo, setTestTo] = useState<string[]>([]);

  const { mutate: sendEmail, isPending: isSending } = usePost<
    BaseResponse<{ success: boolean }>,
    SendEmailRequest
  >(sendInvoiceEmailApi(merchantId, invoiceId), { invalidateQueries: false });

  const handleSend = () => {
    if (to.length === 0) {
      toast.error("Add at least one recipient");
      return;
    }

    sendEmail(
      {
        receiverEmails: to,
        // Omitted when empty rather than sent as [], matching what production's
        // form produces for an untouched field.
        ...(cc.length > 0 ? { receiverCcEmails: cc } : {}),
        ...(bcc.length > 0 ? { receiverBccEmails: bcc } : {}),
      },
      {
        onSuccess: () => {
          toast.success("Invoice sent", { description: `Emailed to ${to.join(", ")}` });
          onClose();
        },
        onError: (error) => toast.error("Couldn't send the email", { description: error.message }),
      }
    );
  };

  const handleTestSend = () => {
    if (testTo.length === 0) {
      toast.error("Add an address to send the test to");
      return;
    }
    sendEmail(
      { receiverEmails: testTo },
      {
        onSuccess: () =>
          toast.success("Test email sent", { description: `Sent to ${testTo.join(", ")}` }),
        onError: (error) => toast.error("Couldn't send the test", { description: error.message }),
      }
    );
  };

  return (
    <div className="flex min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <div className="space-y-3">
          {/* No "Send to {client}" heading above the field: the dialog title
              already names the invoice, and a heading saying "Send to" sitting
              directly on top of a field labelled "Send to" just read as the
              same thing twice. The client's name moves into the description,
              where it explains the address that was prefilled. */}
          <Field>
            <FieldLabel htmlFor="email-to">Send to</FieldLabel>
            <EmailRecipientsInput
              id="email-to"
              value={to}
              placeholder="accounts@client.com"
              onChange={setTo}
            />
            <FieldDescription>
              {clientEmail
                ? `Prefilled with ${clientName || "the client"}'s billing email. Press Enter or comma after each address to add it.`
                : "Press Enter or comma after each address to add it."}
            </FieldDescription>
          </Field>

          <div className="flex items-center gap-3">
            {!showCc && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0"
                leftIcon={<Icon name="plus" className="h-3 w-3" />}
                onClick={() => setShowCc(true)}
              >
                CC
              </Button>
            )}
            {!showBcc && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0"
                leftIcon={<Icon name="plus" className="h-3 w-3" />}
                onClick={() => setShowBcc(true)}
              >
                BCC
              </Button>
            )}
          </div>

          {showCc && (
            <Field>
              <FieldLabel htmlFor="email-cc">CC</FieldLabel>
              <EmailRecipientsInput id="email-cc" value={cc} onChange={setCc} />
            </Field>
          )}

          {showBcc && (
            <Field>
              <FieldLabel htmlFor="email-bcc">BCC</FieldLabel>
              <EmailRecipientsInput id="email-bcc" value={bcc} onChange={setBcc} />
            </Field>
          )}
        </div>

        <div className="space-y-3 rounded-xl border border-border p-4">
          <p className="text-[13.5px] font-semibold text-foreground">Check with a test email</p>
          <p className="text-[12px] text-muted-foreground">
            Sends the same invoice to an address of your choosing, so you can see it as the client
            will.
          </p>
          <EmailRecipientsInput
            id="email-test"
            value={testTo}
            placeholder="you@yourcompany.com"
            onChange={setTestTo}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isSending}
            onClick={handleTestSend}
          >
            Send test email
          </Button>
        </div>
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={isSending}
          leftIcon={<Icon name="send" className="h-3.5 w-3.5" />}
          onClick={handleSend}
        >
          {isSending ? "Sending…" : "Send invoice"}
        </Button>
      </div>
    </div>
  );
}
