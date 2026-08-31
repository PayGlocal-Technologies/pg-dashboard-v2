"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { AppImage } from "@/components/common/AppImage";
import { Button, Card, PageHeader, Shimmer } from "@/components/ui";
import { useApp } from "@/stores/useApp";
import { SettingsDetailRow } from "@/features/dashboard/settings/components/SettingsDetailRow";
import {
  EditContactDialog,
  type ContactType,
} from "@/features/dashboard/settings/components/EditContactDialog";
import { ChangePasswordDialog } from "@/features/dashboard/settings/components/ChangePasswordDialog";
import { useContactDetails } from "@/features/dashboard/settings/hooks";

const PHOTO_MAX_MB = 5;
const PHOTO_ACCEPTED = ["image/jpeg", "image/png"];

/** First + last initials for the avatar fallback, e.g. "Dhruv Rathee" → "DR". */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length || name === "Not available") return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function PersonalDetailsFeature() {
  const profile = useApp((s) => s.profile);
  const fullName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    profile?.username ||
    "Not available";

  // BACKEND GAP: no profile-photo upload endpoint yet, so the chosen image is a
  // local, session-only preview (revoked when replaced). Wire to the real upload
  // when it lands.
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onPhotoChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    event.target.value = ""; // let the same file be re-picked after a rejection
    if (!file) return;
    if (!PHOTO_ACCEPTED.includes(file.type)) {
      toast.error("Use a JPG or PNG image.");
      return;
    }
    if (file.size > PHOTO_MAX_MB * 1024 * 1024) {
      toast.error(`Image must be under ${PHOTO_MAX_MB} MB.`);
      return;
    }
    setPhotoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

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
      <PageHeader title="Personal details" subtitle="Your name, photo, and how we reach you." />

      <Card className="gap-0 p-0">
        <div className="divide-y divide-border px-5">
          {/* Profile photo. Shown to customers on the checkout page. */}
          <div className="py-5">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-lg font-bold text-muted-foreground">
                {photoUrl ? (
                  <AppImage
                    src={photoUrl}
                    alt="Profile photo"
                    width={64}
                    height={64}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initialsOf(fullName)
                )}
              </span>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change photo
                </Button>
                <p className="mt-1.5 text-xs text-muted-foreground">JPG or PNG, up to 5 MB.</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Note: This image will be displayed to your customers on the checkout page.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={onPhotoChange}
            />
          </div>

          <SettingsDetailRow label="Full name" value={fullName} />

          {/* BACKEND GAP: /contact is read-only — there is no endpoint to change
              a signed-in user's own email/phone, so the Edit dialog is a mocked
              OTP flow. The displayed value itself is real. */}
          <div className="flex items-center justify-between gap-4 py-3">
            <p className="text-sm text-muted-foreground">Phone number</p>
            <div className="flex items-center gap-3">
              {isLoading && !phoneOverride ? (
                <Shimmer className="h-4 w-32" />
              ) : (
                <span className="text-sm font-semibold text-foreground">{phone}</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 py-3">
            <p className="text-sm text-muted-foreground">Email ID</p>
            <div className="flex items-center gap-3">
              {isLoading && !emailOverride ? (
                <Shimmer className="h-4 w-40" />
              ) : (
                <span className="text-sm font-semibold text-foreground">{email}</span>
              )}
              <Button variant="outline" size="sm" onClick={() => setEditingContact("email")}>
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
