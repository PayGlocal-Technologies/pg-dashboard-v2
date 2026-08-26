"use client";

import { useState } from "react";
import { Badge, Button, Card, PageHeader, Shimmer } from "@/components/ui";
import { useApp } from "@/stores/useApp";
import { SettingsDetailRow } from "@/features/dashboard/settings/components/SettingsDetailRow";
import {
  EditContactDialog,
  type ContactType,
} from "@/features/dashboard/settings/components/EditContactDialog";
import { ChangePasswordDialog } from "@/features/dashboard/settings/components/ChangePasswordDialog";
import { useContactDetails } from "@/features/dashboard/settings/hooks";

export function PersonalDetailsFeature() {
  const profile = useApp((s) => s.profile);
  const fullName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    profile?.username ||
    "Not available";

  // Email + phone now come from the real /contact endpoint (read-only in
  // pg-dashboard). The overrides below only carry the mock edit dialog's result
  // for this session — see the BACKEND GAP note on the Edit buttons.
  const { contact, isLoading } = useContactDetails();
  const [emailOverride, setEmailOverride] = useState<string | null>(null);
  const [phoneOverride, setPhoneOverride] = useState<string | null>(null);

  const email = emailOverride ?? contact?.emailId ?? profile?.emailId ?? "Not available";
  const phone = phoneOverride ?? contact?.phoneNumber ?? "Not available";

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactType | null>(null);

  return (
    <div className="space-y-5">
      <PageHeader title="Personal details" subtitle="Your profile and contact information." />

      <Card className="gap-0 p-0">
        <div className="divide-y divide-border px-5">
          <SettingsDetailRow label="Full name" value={fullName} />

          {/* BACKEND GAP: /contact is read-only — there is no endpoint to change
              a signed-in user's own email/phone, so the Edit dialog is a mocked
              OTP flow. The displayed value itself is real. */}
          <div className="flex items-center justify-between gap-4 py-3">
            <p className="text-sm text-muted-foreground">Email ID</p>
            <div className="flex items-center gap-3">
              {isLoading && !emailOverride ? (
                <Shimmer className="h-4 w-40" />
              ) : (
                <span className="text-sm font-semibold text-foreground">{email}</span>
              )}
              <Badge variant="secondary" size="sm">
                Edit not available yet
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setEditingContact("email")}>
                Edit
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 py-3">
            <p className="text-sm text-muted-foreground">Phone number</p>
            <div className="flex items-center gap-3">
              {isLoading && !phoneOverride ? (
                <Shimmer className="h-4 w-32" />
              ) : (
                <span className="text-sm font-semibold text-foreground">{phone}</span>
              )}
              <Badge variant="secondary" size="sm">
                Edit not available yet
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setEditingContact("phone")}>
                Edit
              </Button>
            </div>
          </div>

          {/* Password change is a real, encrypted endpoint — see ChangePasswordDialog. */}
          <div className="flex items-center justify-between gap-4 py-3">
            <p className="text-sm text-muted-foreground">Password</p>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-foreground">••••••••••••</span>
              <Button variant="outline" size="sm" onClick={() => setPasswordDialogOpen(true)}>
                Change password
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <ChangePasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />

      {editingContact && (
        <EditContactDialog
          type={editingContact}
          open
          onOpenChange={(next) => {
            if (!next) setEditingContact(null);
          }}
          onConfirm={editingContact === "email" ? setEmailOverride : setPhoneOverride}
        />
      )}
    </div>
  );
}
