"use client";

import type { QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { useAppForm } from "@/components/form/AppForm";
import { check, email, required, rules } from "@/components/form/rules";
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

/**
 * Per-field rules, the same ones the Send button used to be silently disabled
 * on. Every field is required, so each carries a * (from `required`) and the
 * button stays live: a press with gaps names each one.
 */
const FIELD_RULES = {
  firstName: rules(required("First name")),
  lastName: rules(required("Last name")),
  username: rules(required("Username")),
  department: rules(required("Role")),
  email: rules(required("Email ID"), email("Enter a valid email ID")),
  phone: rules(
    required("Phone number"),
    check((value: string) => value.replace(/\D/g, "").length < 7 && "Enter a valid phone number")
  ),
};

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

  const form = useAppForm({
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

        <form.AppForm>
          <form.Form className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <form.AppField name="firstName" validators={{ onChange: FIELD_RULES.firstName }}>
                  {(field) => <field.TextField id="firstName" label="First name" />}
                </form.AppField>

                <form.AppField name="lastName" validators={{ onChange: FIELD_RULES.lastName }}>
                  {(field) => <field.TextField id="lastName" label="Last name" />}
                </form.AppField>
              </div>

              <form.AppField name="username" validators={{ onChange: FIELD_RULES.username }}>
                {(field) => (
                  <field.TextField id="username" label="Username" placeholder="e.g. priya.nair" />
                )}
              </form.AppField>

              <form.AppField name="department" validators={{ onChange: FIELD_RULES.department }}>
                {(field) => (
                  <field.SelectField
                    id="role"
                    label="Role / Department"
                    options={departmentOptions}
                    placeholder={rolesQuery.isPending ? "Loading roles…" : "Select a role"}
                    triggerClassName=""
                  />
                )}
              </form.AppField>

              <form.AppField name="email" validators={{ onChange: FIELD_RULES.email }}>
                {(field) => <field.TextField id="email" type="email" label="Email ID" />}
              </form.AppField>

              <form.AppField name="phone" validators={{ onChange: FIELD_RULES.phone }}>
                {(field) => (
                  <field.CustomField<string> id="phone" label="Phone number">
                    {({ id, value, invalid, onChange, onBlur }) => (
                      <InputGroup>
                        <InputGroupAddon>+91</InputGroupAddon>
                        <InputGroupInput
                          id={id}
                          type="tel"
                          value={value}
                          onChange={(e) => onChange(e.target.value)}
                          onBlur={onBlur}
                          aria-invalid={invalid || undefined}
                        />
                      </InputGroup>
                    )}
                  </field.CustomField>
                )}
              </form.AppField>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
              <Button type="button" variant="outline" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <form.SubmitButton
                pending={isPending}
                leftIcon={<Icon name="send-horizontal" className="h-3.5 w-3.5" />}
              >
                Send Invite
              </form.SubmitButton>
            </div>
          </form.Form>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  );
}
