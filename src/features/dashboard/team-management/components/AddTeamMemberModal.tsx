"use client";

import { useForm } from "@tanstack/react-form";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Field,
  FieldLabel,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { ROLE_OPTIONS } from "@/features/dashboard/team-management/constants";
import { TEAM_MERCHANT_ID } from "@/features/dashboard/team-management/mock-data";
import type { TeamMemberRole, TeamMemberRow } from "@/features/dashboard/team-management/types";

interface AddTeamMemberFormValues {
  firstName: string;
  lastName: string;
  username: string;
  role: TeamMemberRole;
  email: string;
  phone: string;
  whatsappEchoEnabled: boolean;
}

const DEFAULT_VALUES: AddTeamMemberFormValues = {
  firstName: "",
  lastName: "",
  username: "",
  role: "VIEW_ONLY",
  email: "",
  phone: "",
  whatsappEchoEnabled: false,
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function computeIsValid(v: AddTeamMemberFormValues): boolean {
  return Boolean(
    v.firstName.trim() &&
      v.lastName.trim() &&
      v.username.trim() &&
      isValidEmail(v.email) &&
      v.phone.replace(/\D/g, "").length >= 7
  );
}

/** Only called from the submit handler (an event handler, not render), safe
 * per this project's hooks-purity rule against Math.random/Date math during
 * render, see CreatePaymentLinkModal's identical note. */
function generateShortId(): string {
  return Math.random().toString(36).slice(2, 8);
}

function nowIso(): string {
  return new Date().toISOString();
}

interface AddTeamMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited: (row: TeamMemberRow) => void;
}

export function AddTeamMemberModal({ open, onOpenChange, onInvited }: AddTeamMemberModalProps) {
  const form = useForm({
    defaultValues: DEFAULT_VALUES,
    onSubmit: async ({ value }) => {
      const row: TeamMemberRow = {
        id: `usr_${generateShortId()}`,
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        username: value.username.trim(),
        role: value.role,
        merchantId: TEAM_MERCHANT_ID,
        status: "INVITE_SENT",
        phoneCountryCode: "+91",
        phone: value.phone.trim(),
        email: value.email.trim(),
        whatsappEchoEnabled: value.whatsappEchoEnabled,
        invitedAt: nowIso(),
      };
      onOpenChange(false);
      form.reset();
      onInvited(row);
    },
  });

  function handleClose() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-125 flex-col gap-0 overflow-hidden p-0">
        <div className="shrink-0 border-b border-border px-6 py-4 pr-14">
          <DialogTitle>Add team member</DialogTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Invite a teammate and set their access role for this account.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="flex min-h-0 flex-1 flex-col"
          noValidate
        >
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <form.Field name="firstName">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="firstName">First name</FieldLabel>
                    <Input
                      id="firstName"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      required
                    />
                  </Field>
                )}
              </form.Field>

              <form.Field name="lastName">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="lastName">Last name</FieldLabel>
                    <Input
                      id="lastName"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      required
                    />
                  </Field>
                )}
              </form.Field>
            </div>

            <form.Field name="username">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="username">Username</FieldLabel>
                  <Input
                    id="username"
                    placeholder="e.g. priya.nair"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    required
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="role">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="role">Role</FieldLabel>
                  <Select value={field.state.value} onValueChange={(v) => field.handleChange(v as TeamMemberRole)}>
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>

            <form.Field name="email">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="email">Email ID</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    required
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="phone">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="phone">Phone number</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>+91</InputGroupAddon>
                    <InputGroupInput
                      id="phone"
                      type="tel"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      required
                    />
                  </InputGroup>
                </Field>
              )}
            </form.Field>

            <form.Field name="whatsappEchoEnabled">
              {(field) => (
                <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Enable Echo on WhatsApp</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Send this member account activity updates over WhatsApp.
                    </p>
                  </div>
                  <Switch checked={field.state.value} onCheckedChange={field.handleChange} />
                </div>
              )}
            </form.Field>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
            <Button type="button" variant="outline" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <form.Subscribe selector={(s) => [s.values, s.isSubmitting] as const}>
              {([values, isSubmitting]) => (
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!computeIsValid(values) || isSubmitting}
                  leftIcon={<Icon name="send-horizontal" className="h-3.5 w-3.5" />}
                >
                  Send Invite
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
