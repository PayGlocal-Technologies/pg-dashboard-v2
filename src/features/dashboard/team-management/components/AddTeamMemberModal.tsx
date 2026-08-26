"use client";

import { useForm } from "@tanstack/react-form";
import type { QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
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
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { useGet, usePost } from "@/lib/api/hooks";
import { buildDepartmentOptions } from "@/features/dashboard/team-management/constants";
import { iamRolesApi, inviteTempUserApi } from "@/features/dashboard/team-management/services";
import type { InviteTempUserBody, RolesResponse } from "@/features/dashboard/team-management/types";

interface AddTeamMemberFormValues {
  firstName: string;
  lastName: string;
  username: string;
  /** Holds the selected role's `department` string (see submit mapping). */
  department: string;
  email: string;
  phone: string;
}

const DEFAULT_VALUES: AddTeamMemberFormValues = {
  firstName: "",
  lastName: "",
  username: "",
  department: "",
  email: "",
  phone: "",
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function computeIsValid(v: AddTeamMemberFormValues): boolean {
  return Boolean(
    v.firstName.trim() &&
    v.lastName.trim() &&
    v.username.trim() &&
    v.department.trim() &&
    isValidEmail(v.email) &&
    v.phone.replace(/\D/g, "").length >= 7
  );
}

interface AddTeamMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** MID the invited user is attached to. */
  mid: string;
  /** midType passed into the invite body + roles lookup. */
  midType: string;
  /** List query key(s) to invalidate on a successful invite. */
  invalidateKey: QueryKey[];
}

export function AddTeamMemberModal({
  open,
  onOpenChange,
  mid,
  midType,
  invalidateKey,
}: AddTeamMemberModalProps) {
  // Roles/departments are fetched live (dynamic on the backend). Enabled only
  // while the dialog is open — the dialog mounts on open, so no lazy refetch
  // dance is needed (unlike pg-dashboard's enabled:false + refetch).
  const rolesQuery = useGet<RolesResponse>(["iam-roles", mid, midType], iamRolesApi(mid, midType), {
    enabled: open && !!mid,
  });
  const roles = rolesQuery.data?.data?.roles ?? [];
  const departmentOptions = buildDepartmentOptions(roles);

  const { mutate: invite, isPending } = usePost<unknown, InviteTempUserBody>(inviteTempUserApi, {
    invalidateQueries: invalidateKey,
  });

  const form = useForm({
    defaultValues: DEFAULT_VALUES,
    onSubmit: async ({ value }) => {
      // Old dashboard mapping: the dropdown shows `department`, submits it as
      // `department`, and sends the matching role's `name` as `role`.
      const selectedRole = roles.find((r) => r.department === value.department);
      const body: InviteTempUserBody = {
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        emailId: value.email.trim(),
        // NOTE: domestic default. Global-tenant calling-code selection is an
        // open follow-up (see plan) — pg-dashboard branches on isGlobalTenant.
        regionCode: "+91",
        phoneNumber: value.phone.trim(),
        department: value.department,
        newMid: false,
        limitedTimeAccessUser: false,
        midType,
        role: selectedRole?.name ?? "",
        userName: value.username.trim(),
        parentMid: mid || "payglocal_mid",
        mid,
        limitedTimeAccessHours: false,
        limitedTimeAccessMinutes: false,
      };
      invite(body, {
        onSuccess: () => {
          toast.success("Teammate invited successfully");
          onOpenChange(false);
          form.reset();
        },
        onError: (error) => toast.error(error.message),
      });
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

            <form.Field name="department">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="role">Role / Department</FieldLabel>
                  <Select value={field.state.value} onValueChange={(v) => field.handleChange(v)}>
                    <SelectTrigger id="role">
                      <SelectValue
                        placeholder={rolesQuery.isPending ? "Loading roles…" : "Select a role"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentOptions.map((opt) => (
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
                  disabled={!computeIsValid(values) || isSubmitting || isPending}
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
