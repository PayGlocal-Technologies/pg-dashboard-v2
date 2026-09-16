"use client";

import { useState } from "react";
import {
  Button,
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui";
import {
  TICKET_ISSUES,
  categoriesForIssue,
} from "@/features/dashboard/support-tickets/classification";
import {
  DESCRIPTION_MAX_LENGTH,
  SUBJECT_MAX_LENGTH,
} from "@/features/dashboard/support-tickets/constants";
import { TicketAttachmentField } from "@/features/dashboard/support-tickets/components/TicketAttachmentField";
import { useCreateTicket } from "@/features/dashboard/support-tickets/hooks";
import { useTicketAttachments } from "@/features/dashboard/support-tickets/useTicketAttachments";
import type { SupportTicket } from "@/features/dashboard/support-tickets/types";

/**
 * The raise-ticket form: subject, a two-level classification picker, the
 * description, and optional attachments.
 *
 * The classification is two dependent `Select`s rather than one flat list
 * because Freshdesk's own field is nested — a category is only valid under its
 * own issue, and the API validates that. Picking a new issue clears the
 * category for the same reason: keeping "Delay in settlement" selected after
 * switching to "Refunds" would send a pair the backend rejects.
 *
 * `cfBusiness` is not asked for — it is derived from the active product
 * context in `useCreateTicket` — and `cfTeam` is left to the server's default.
 * Neither is something a merchant can answer.
 */
export function RaiseTicketForm({ onRaised }: { onRaised?: (ticket: SupportTicket) => void }) {
  const { createTicket, isCreating, canCreate } = useCreateTicket();
  const attachments = useTicketAttachments();

  const [subject, setSubject] = useState("");
  const [issue, setIssue] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const categories = categoriesForIssue(issue);

  // Subject and description are the API's only required fields; the issue and
  // category are required here anyway, since letting them default routes the
  // ticket to "Merchant Request / Escalation Matrix" regardless of what it is
  // actually about.
  const canSubmit =
    canCreate &&
    !isCreating &&
    subject.trim().length > 0 &&
    description.trim().length > 0 &&
    !!issue &&
    !!category;

  const handleSubmit = () => {
    if (!canSubmit) return;

    createTicket(
      {
        subject,
        description,
        cfIssue: issue,
        cfCategory: category,
        attachments: attachments.files,
      },
      (ticket) => {
        setSubject("");
        setIssue("");
        setCategory("");
        setDescription("");
        attachments.clear();
        onRaised?.(ticket);
      }
    );
  };

  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel htmlFor="ticket-subject" className="text-[12.5px]">
          Subject
        </FieldLabel>
        <Input
          id="ticket-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={SUBJECT_MAX_LENGTH}
          placeholder="e.g. June settlement not credited"
          className="text-[13px]"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="ticket-issue" className="text-[12.5px]">
            What is this about?
          </FieldLabel>
          <Select
            value={issue}
            onValueChange={(value) => {
              setIssue(value);
              // The old category cannot be valid under a new issue.
              setCategory("");
            }}
          >
            <SelectTrigger id="ticket-issue" aria-label="Issue">
              <SelectValue placeholder="Choose a topic" />
            </SelectTrigger>
            <SelectContent>
              {TICKET_ISSUES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="ticket-category" className="text-[12.5px]">
            More specifically
          </FieldLabel>
          <Select value={category} onValueChange={setCategory} disabled={!issue}>
            <SelectTrigger id="ticket-category" aria-label="Category">
              <SelectValue placeholder={issue ? "Choose a category" : "Choose a topic first"} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label ?? option.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="ticket-details" className="text-[12.5px]">
          Details
        </FieldLabel>
        <Textarea
          id="ticket-details"
          rows={4}
          value={description}
          maxLength={DESCRIPTION_MAX_LENGTH}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what's happening. Include any transaction, settlement or account IDs that would help us look into it."
          className="min-h-28 px-3 py-2 text-[13px] leading-normal"
        />
        <FieldDescription className="text-[11px]">
          Please don&apos;t include card numbers, CVV or full bank account numbers.
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel className="text-[12.5px]">
          Attachments <span className="font-normal text-muted-foreground">(optional)</span>
        </FieldLabel>
        <TicketAttachmentField attachments={attachments} disabled={isCreating} />
      </Field>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={!canSubmit}
          isLoading={isCreating}
          onClick={handleSubmit}
        >
          Raise ticket
        </Button>
      </div>
    </div>
  );
}
