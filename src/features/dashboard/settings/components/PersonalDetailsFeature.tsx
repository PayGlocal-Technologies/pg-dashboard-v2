"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { AppImage } from "@/components/common/AppImage";
import { Button, Card, PageHeader, Shimmer } from "@/components/ui";
import { useLogout } from "@/lib/hooks/useLogout";
import { useApp } from "@/stores/useApp";
import { SettingsDetailRow } from "@/features/dashboard/settings/components/SettingsDetailRow";
import { ChangeEmailDialog } from "@/features/dashboard/settings/components/ChangeEmailDialog";
import { ChangePasswordDialog } from "@/features/dashboard/settings/components/ChangePasswordDialog";
import {
  useContactDetails,
  useMerchantBusinessProfile,
  useUpdateMerchantLogo,
} from "@/features/dashboard/settings/hooks";

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

  // The checkout logo. Displayed value is either a remote S3 URL (once uploaded)
  // or, mid-upload, a local object-URL preview shown optimistically. Only object
  // URLs (blob:) are revoked; the remote URL is left alone.
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadLogo, isUploading, canUpload } = useUpdateMerchantLogo();

  // The already-stored logo from the merchant profile, so the current image
  // shows on load. A fresh upload (photoUrl) takes precedence over it.
  const { businessProfile } = useMerchantBusinessProfile();
  const displayPhoto = photoUrl ?? businessProfile?.merchantLogoPublicUrl ?? null;

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
    if (!canUpload) {
      toast.error("Still loading your account. Try again in a moment.");
      return;
    }

    // Show the picked image immediately, then send it. The optimistic preview is
    // swapped for the server's stored URL on success, or rolled back on failure.
    const previewUrl = URL.createObjectURL(file);
    setPhotoUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return previewUrl;
    });

    const body = new FormData();
    body.append("merchantLogo", file);
    uploadLogo(body, {
      onSuccess: () => {
        URL.revokeObjectURL(previewUrl);
        // Drop the local preview so the display falls back to the cache-busted
        // URL the hook just wrote into the shared profile cache (see
        // useUpdateMerchantLogo) — same source the sidebar avatar reads.
        setPhotoUrl(null);
        toast.success("Logo updated.");
      },
      onError: () => {
        URL.revokeObjectURL(previewUrl);
        setPhotoUrl((cur) => (cur === previewUrl ? null : cur));
        toast.error("Couldn't upload the image. Please try again.");
      },
    });
  };

  // Email + phone come from the real /contact endpoint (read-only in
  // pg-dashboard). Email is changed through its own six-step flow, which ends
  // the session — so there is nothing to update in place here.
  const { contact, isLoading } = useContactDetails();

  const email = contact?.emailId ?? profile?.emailId ?? "Not available";
  const phone = contact?.phoneNumber ?? "Not available";

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const { logout } = useLogout();

  return (
    <div className="space-y-5">
      <PageHeader title="Personal details" subtitle="Your name, photo, and how we reach you." />

      <Card className="gap-0 p-0">
        <div className="divide-y divide-border px-5">
          {/* Profile photo. Shown to customers on the checkout page. */}
          <div className="py-5">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-lg font-bold text-muted-foreground">
                {displayPhoto ? (
                  <AppImage
                    src={displayPhoto}
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
                  isLoading={isUploading}
                  disabled={isUploading || !canUpload}
                >
                  {isUploading ? "Uploading…" : "Change photo"}
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

          {/* BACKEND GAP: /contact is read-only and there is no endpoint to
              change a signed-in user's own phone, so this row has no Edit
              action. Email does — see ChangeEmailDialog. */}
          <div className="flex items-center justify-between gap-4 py-3">
            <p className="text-sm text-muted-foreground">Phone number</p>
            <div className="flex items-center gap-3">
              {isLoading ? (
                <Shimmer className="h-4 w-32" />
              ) : (
                <span className="text-sm font-semibold text-foreground">{phone}</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 py-3">
            <p className="text-sm text-muted-foreground">Email ID</p>
            <div className="flex items-center gap-3">
              {isLoading ? (
                <Shimmer className="h-4 w-40" />
              ) : (
                <span className="text-sm font-semibold text-foreground">{email}</span>
              )}
              {/* Gated on a known current address: step 1 mails the code there,
                  and the first screen has nothing to show without it. */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setChangingEmail(true)}
                disabled={isLoading || email === "Not available"}
              >
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

      {/* Mounted only while open so each run starts from step 1. */}
      {changingEmail && (
        <ChangeEmailDialog
          currentEmail={email}
          onOpenChange={setChangingEmail}
          // Both endings ended the session server-side, so both lead to login.
          // useLogout clears the local stores on the way out — without that the
          // next visitor to this browser would rehydrate the old profile.
          onCompleted={() => logout()}
          onSessionEnded={() => logout()}
        />
      )}
    </div>
  );
}
