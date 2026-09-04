"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Field,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui";
import { useSupportTickets } from "@/stores/useSupportTickets";
import {
  CUSTOM_SUBJECT_MAX_LENGTH,
  TICKET_TOPICS,
} from "@/features/dashboard/support-tickets/constants";
import type { SupportTicket, TicketTopic } from "@/features/dashboard/support-tickets/types";

/**
 * The raise-ticket form: a subject dropdown, an optional free-text line that
 * only appears for "Others" (the dropdown alone can't name a subject it
 * doesn't have), and the details a merchant actually wants read.
 *
 * `onRaised` lets the dialog around this switch to "My tickets" and highlight
 * the new one — this component only ever creates a ticket, it doesn't own
 * where the merchant lands afterwards.
 */
export function RaiseTicketForm({ onRaised }: { onRaised?: (ticket: SupportTicket) => void }) {
  const raiseTicket = useSupportTickets((s) => s.raiseTicket);

  const [topic, setTopic] = useState<TicketTopic | "">("");
  const [customSubject, setCustomSubject] = useState("");
  const [details, setDetails] = useState("");

  const canSubmit = !!topic && details.trim().length > 0;

  const handleSubmit = () => {
    if (!topic || !details.trim()) return;

    const ticket = raiseTicket({ topic, customSubject, details });

    toast.success("Ticket raised", {
      description: "You can track its status under My tickets.",
    });

    setTopic("");
    setCustomSubject("");
    setDetails("");
    onRaised?.(ticket);
  };

  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel htmlFor="ticket-subject" className="text-[12.5px]">
          Subject
        </FieldLabel>
        <Select value={topic} onValueChange={(value) => setTopic(value as TicketTopic)}>
          <SelectTrigger id="ticket-subject" aria-label="Ticket subject">
            <SelectValue placeholder="Choose what this is about" />
          </SelectTrigger>
          <SelectContent>
            {TICKET_TOPICS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Only "Others" needs a name for its own subject — every other option
          already is one. Optional: the Details field below is where the
          actual explanation belongs, this is just a short label for it. */}
      {topic === "OTHERS" && (
        <Field>
          <FieldLabel htmlFor="ticket-custom-subject" className="text-[12.5px]">
            Add a subject <span className="font-normal text-muted-foreground">(optional)</span>
          </FieldLabel>
          <Input
            id="ticket-custom-subject"
            value={customSubject}
            onChange={(e) => setCustomSubject(e.target.value)}
            maxLength={CUSTOM_SUBJECT_MAX_LENGTH}
            placeholder="e.g. API integration query"
            className="text-[13px]"
          />
        </Field>
      )}

      <Field>
        <FieldLabel htmlFor="ticket-details" className="text-[12.5px]">
          Details
        </FieldLabel>
        <Textarea
          id="ticket-details"
          rows={4}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Describe what's happening — include any transaction, settlement or account IDs that would help us look into it."
          className="min-h-28 px-3 py-2 text-[13px] leading-normal"
        />
      </Field>

      <div className="flex justify-end">
        <Button type="button" variant="primary" size="sm" disabled={!canSubmit} onClick={handleSubmit}>
          Raise ticket
        </Button>
      </div>
    </div>
  );
}
