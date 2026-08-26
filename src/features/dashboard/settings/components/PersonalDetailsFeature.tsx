"use client";

import { useState } from "react";
import { Button, Card, PageHeader } from "@/components/ui";
import { useApp } from "@/stores/useApp";
import { SettingsDetailRow } from "@/features/dashboard/settings/components/SettingsDetailRow";
import {
  EditContactDialog,
  type ContactType,
} from "@/features/dashboard/settings/components/EditContactDialog";
import { ChangePasswordDialog } from "@/features/dashboard/settings/components/ChangePasswordDialog";

// TODO(integration): no update-profile endpoint exists yet, email/phone
// edits only update local state for this session, ProfileData also has no
// phone field at all yet (see useApp.ts), so phone starts from a mock value.
export function PersonalDetailsFeature() {
  const profile = useApp((s) => s.profile);
  const fullName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    profile?.username ||
    "Not available";

  const [email, setEmail] = useState(profile?.emailId ?? "");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactType | null>(null);

  return (
    <div className="space-y-5">
      <PageHeader title="Personal details" subtitle="Your profile and contact information." />

      <Card className="gap-0 p-0">
        <div className="divide-y divide-border px-5">
          <SettingsDetailRow label="Full name" value={fullName} />

          <div className="flex items-center justify-between gap-4 py-3">
            <p className="text-sm text-muted-foreground">Email ID</p>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground">{email}</span>
              <Button variant="outline" size="sm" onClick={() => setEditingContact("email")}>
                Edit
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 py-3">
            <p className="text-sm text-muted-foreground">Phone number</p>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground">{phone}</span>
              <Button variant="outline" size="sm" onClick={() => setEditingContact("phone")}>
                Edit
              </Button>
            </div>
          </div>

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
          onConfirm={editingContact === "email" ? setEmail : setPhone}
        />
      )}
    </div>
  );
}
