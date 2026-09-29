"use client";

import { useStore } from "@tanstack/react-form";
import { Field, FieldDescription, FieldLabel, Textarea } from "@/components/ui";
import { useAppForm } from "@/components/form/AppForm";
import { required, rules } from "@/components/form/rules";
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

  // Subject and description are the API's only required fields; the issue and
  // category are required here anyway, since letting them default routes the
  // ticket to "Merchant Request / Escalation Matrix" regardless of what it is
  // actually about. Raise stays enabled; errors follow the app-wide rule
  // (components/form). The two pickers are labelled as questions, so their
  // messages name the thing ("Issue type is required").
  const form = useAppForm({
    defaultValues: { subject: "", issue: "", category: "", description: "" },
    onSubmit: ({ value, formApi }) => {
      if (blockedReason || isCreating) return;
      createTicket(
        {
          subject: value.subject,
          description: value.description,
          cfIssue: value.issue,
          cfCategory: value.category,
          attachments: attachments.files,
        },
        (ticket) => {
          formApi.reset();
          attachments.clear();
          onRaised?.(ticket);
        }
      );
    },
  });
  const issue = useStore(form.store, (state) => state.values.issue);
  const categories = categoriesForIssue(issue);

  // Not being able to raise tickets at all is the one case the button stays
  // disabled for, and it says why.
  const blockedReason = canCreate ? null : "You don't have permission to raise tickets";

  return (
    <form.AppForm>
      <form.Form className="space-y-4">
        <form.AppField name="subject" validators={{ onChange: rules(required("Subject")) }}>
          {(field) => (
            <field.TextField
              id="ticket-subject"
              label="Subject"
              labelClassName="text-[12.5px]"
              maxLength={SUBJECT_MAX_LENGTH}
              placeholder="e.g. June settlement not credited"
              inputClassName="text-[13px]"
            />
          )}
        </form.AppField>

        <div className="grid gap-4 sm:grid-cols-2">
          <form.AppField name="issue" validators={{ onChange: rules(required("Issue type")) }}>
            {(field) => (
              <field.SelectField
                id="ticket-issue"
                label="What is this about?"
                labelClassName="text-[12.5px]"
                placeholder="Choose a topic"
                options={TICKET_ISSUES}
                triggerClassName=""
                onValueChange={() => {
                  // The old category cannot be valid under a new issue. A
                  // programmatic clear, so it only re-checks one in play.
                  form.setFieldValue("category", "", { dontValidate: true });
                  const meta = form.getFieldMeta("category");
                  if (meta?.isTouched || meta?.errors.length) {
                    void form.validateField("category", "change");
                  }
                }}
              />
            )}
          </form.AppField>

          <form.AppField name="category" validators={{ onChange: rules(required("Category")) }}>
            {(field) => (
              <field.SelectField
                id="ticket-category"
                label="More specifically"
                labelClassName="text-[12.5px]"
                placeholder={issue ? "Choose a category" : "Choose a topic first"}
                options={categories.map((option) => ({
                  value: option.value,
                  label: option.label ?? option.value,
                }))}
                disabled={!issue}
                triggerClassName=""
              />
            )}
          </form.AppField>
        </div>

        <form.AppField
          name="description"
          validators={{ onChange: rules(required("Details", "Details are required")) }}
        >
          {(field) => (
            <field.CustomField<string>
              id="ticket-details"
              label="Details"
              labelClassName="text-[12.5px]"
            >
              {({ id, value, invalid, onChange, onBlur }) => (
                <>
                  <Textarea
                    id={id}
                    aria-invalid={invalid || undefined}
                    rows={4}
                    value={value}
                    maxLength={DESCRIPTION_MAX_LENGTH}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={onBlur}
                    placeholder="Describe what's happening. Include any transaction, settlement or account IDs that would help us look into it."
                    className="min-h-28 px-3 py-2 text-[13px] leading-normal"
                  />
                  {/* Always shown, error or not: it's the one line that keeps
                      card and bank numbers out of the ticket. */}
                  <FieldDescription className="text-[11px]">
                    Please don&apos;t include card numbers, CVV or full bank account numbers.
                  </FieldDescription>
                </>
              )}
            </field.CustomField>
          )}
        </form.AppField>

        <Field>
          <FieldLabel className="text-[12.5px]">Attachments</FieldLabel>
          <TicketAttachmentField attachments={attachments} disabled={isCreating} />
        </Field>

        <div className="flex justify-end">
          <form.SubmitButton disabledReason={blockedReason} isLoading={isCreating}>
            Raise ticket
          </form.SubmitButton>
        </div>
      </form.Form>
    </form.AppForm>
  );
}
