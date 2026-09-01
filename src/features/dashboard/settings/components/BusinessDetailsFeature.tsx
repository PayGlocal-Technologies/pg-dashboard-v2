"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, Card, Input, PageHeader, Shimmer } from "@/components/ui";
import { useApp } from "@/stores/useApp";
import { SettingsDetailRow } from "@/features/dashboard/settings/components/SettingsDetailRow";
import {
  useBusinessDetails,
  useMerchantProfile,
  useUpdateBusinessDetails,
} from "@/features/dashboard/settings/hooks";
import type { MerchantProfileAddress } from "@/features/dashboard/settings/types";

interface BusinessField {
  label: string;
  description: string;
  /** Null/empty renders as "Not available". */
  value?: string | null;
  isLoading?: boolean;
}

/** The API's own single-line form when it has one, else the parts joined in the
 *  same order — mirroring pg-dashboard's concatAddress-then-rebuild fallback. */
function formatAddress(address: MerchantProfileAddress | null | undefined): string {
  if (!address) return "";
  const concatenated = address.concatAddress?.trim();
  if (concatenated) return concatenated;
  return [
    address.streetAddress1,
    address.streetAddress2,
    address.city,
    address.state,
    address.zipcode,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

/** "+91 7973430962" when the ISD code is separate, else the number alone. */
function formatPhone(number: string | null | undefined, isd: string | null | undefined): string {
  const digits = number?.trim();
  if (!digits) return "";
  const code = isd?.trim();
  return code && !digits.startsWith(code) ? `${code} ${digits}` : digits;
}

export function BusinessDetailsFeature() {
  const profile = useApp((s) => s.profile);
  const { business, isLoading } = useBusinessDetails();
  const { updateBusiness, isSaving } = useUpdateBusinessDetails();
  // Everything except trade name and purpose codes comes from the merchant
  // profile — a FLAT body, so fields are read straight off it (merchantGST,
  // merchantUrl, merchantAddress.concatAddress, ...).
  const { merchantProfile, isLoading: isProfileLoading } = useMerchantProfile();

  // Purpose codes are the one editable field, mirroring pg-dashboard's
  // BusinessDetails (trade name stays read-only, codes edit + save via PUT).
  const purposeCodes = business?.purposeCode ?? [];
  const [editing, setEditing] = useState(false);
  const [codesInput, setCodesInput] = useState("");

  const startEditing = (): void => {
    setCodesInput(purposeCodes.join(", "));
    setEditing(true);
  };

  const saveCodes = (): void => {
    // pg-dashboard's tagSelect splits on commas; do the same, then drop blanks.
    const purposeCodesList = codesInput
      .split(",")
      .map((code) => code.trim())
      .filter(Boolean);

    updateBusiness(
      { purposeCodes: purposeCodesList },
      {
        onSuccess: () => {
          toast.success("Business details updated successfully.");
          setEditing(false);
        },
        onError: (err: Error) => toast.error(err.message || "Failed to update business details."),
      }
    );
  };

  const businessContact = merchantProfile?.businessContact;

  const readOnlyFields: BusinessField[] = [
    {
      label: "Legal business name",
      description: "As on your incorporation / GST records.",
      // The profile is authoritative; the session's registeredName is the
      // fallback so this row is never blank while the profile loads.
      value: merchantProfile?.merchantRegisteredName ?? profile?.registeredName,
      isLoading: isProfileLoading && !profile?.registeredName,
    },
    {
      label: "Trade name",
      description: "The name customers see, if different from your legal name.",
      value:
        business?.tradeName ?? merchantProfile?.merchantShortName ?? merchantProfile?.displayTag,
      isLoading: isLoading || isProfileLoading,
    },
    {
      label: "Merchant ID",
      description: "Your unique PayGlocal merchant identifier.",
      value: profile?.mid,
    },
    {
      label: "GSTIN",
      description: "15-character GST identification number.",
      value: merchantProfile?.merchantGST,
      isLoading: isProfileLoading,
    },
    {
      label: "Registered address",
      description: "Principal place of business in India.",
      value: formatAddress(merchantProfile?.merchantAddress ?? merchantProfile?.legalAddress),
      isLoading: isProfileLoading,
    },
    {
      label: "Business category",
      description: "Helps us tune risk and reporting templates.",
      value: merchantProfile?.lineOfBusiness,
      isLoading: isProfileLoading,
    },
    {
      label: "Website",
      description: "Your public-facing business website.",
      value: merchantProfile?.merchantUrl,
      isLoading: isProfileLoading,
    },
    {
      label: "Support email",
      description: "Where customer queries are directed.",
      // merchantEmail is often null on older records; the authorised
      // signatory's contact block is the fallback pg-dashboard also falls to.
      value: merchantProfile?.merchantEmail ?? businessContact?.emailId,
      isLoading: isProfileLoading,
    },
    {
      label: "Support phone",
      description: "Shown on receipts and payment pages where applicable.",
      value:
        merchantProfile?.merchantPhone ??
        formatPhone(businessContact?.cellPhoneNumber, businessContact?.cellPhoneISDNumber),
      isLoading: isProfileLoading,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Business details"
        subtitle="Legal and public-facing information for your entity."
      />

      <Card className="gap-0 p-0">
        <div className="border-b border-border p-5">
          <h2 className="text-base font-bold text-foreground">Legal &amp; public profile</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Details shown where required for compliance and customer support.
          </p>
        </div>

        <div className="divide-y divide-border px-5">
          {/* Real, editable purpose codes row. */}
          <div className="flex items-start justify-between gap-6 py-3">
            <div className="max-w-xs">
              <p className="text-sm text-muted-foreground">Purpose code(s)</p>
              <p className="mt-0.5 text-xs text-muted-foreground/70">
                RBI purpose codes used for cross-border transactions.
              </p>
            </div>
            {editing ? (
              <div className="w-full max-w-md space-y-2">
                <Input
                  value={codesInput}
                  onChange={(e) => setCodesInput(e.target.value)}
                  placeholder="e.g. P0104, P0802"
                  className="text-[13px] font-medium text-foreground"
                />
                <p className="text-[11px] text-muted-foreground">
                  Separate multiple codes with commas.
                </p>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={saveCodes} isLoading={isSaving}>
                    Save changes
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {isLoading ? (
                  <Shimmer className="h-4 w-40" />
                ) : (
                  <span className="text-sm font-semibold text-foreground">
                    {purposeCodes.length ? purposeCodes.join(", ") : "Not set"}
                  </span>
                )}
                <Button type="button" variant="outline" size="sm" onClick={startEditing}>
                  Edit
                </Button>
              </div>
            )}
          </div>

          {readOnlyFields.map((field) => (
            <SettingsDetailRow
              key={field.label}
              label={field.label}
              description={field.description}
              value={
                field.isLoading && !field.value ? (
                  <Shimmer className="h-4 w-40" />
                ) : (
                  field.value?.trim() || "Not available"
                )
              }
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
