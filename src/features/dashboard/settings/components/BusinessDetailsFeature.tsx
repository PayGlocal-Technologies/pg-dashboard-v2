"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, Card, Input, PageHeader, Shimmer } from "@/components/ui";
import { useApp } from "@/stores/useApp";
import { SettingsDetailRow } from "@/features/dashboard/settings/components/SettingsDetailRow";
import {
  useBusinessDetails,
  useMerchantBusinessProfile,
  useUpdateBusinessDetails,
} from "@/features/dashboard/settings/hooks";

interface BusinessField {
  label: string;
  description: string;
  /** Empty renders as "Not available". Long values wrap; no multiline variant is
   *  needed now that values are plain text rather than boxed fields. */
  value: string;
  /** Show a shimmer instead of "Not available" while the value is still loading. */
  isLoading?: boolean;
}

/** Known line-of-business codes → human labels. Anything unmapped falls back to
 *  prettifying the code itself ("GOODS_EXPORT" → "Goods export"), so a new code
 *  the backend adds still reads sensibly instead of showing raw. */
const LINE_OF_BUSINESS_LABELS: Record<string, string> = {
  GOODS_EXPORT: "Goods export",
  GOODS_IMPORT: "Goods import",
  SERVICES_EXPORT: "Services export",
  SERVICES_IMPORT: "Services import",
};

function formatLineOfBusiness(code: string | null | undefined): string {
  if (!code) return "";
  if (LINE_OF_BUSINESS_LABELS[code]) return LINE_OF_BUSINESS_LABELS[code];
  const words = code.toLowerCase().replace(/_/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "";
}

export function BusinessDetailsFeature() {
  const profile = useApp((s) => s.profile);
  const { business, isLoading } = useBusinessDetails();
  const { updateBusiness, isSaving } = useUpdateBusinessDetails();
  // GST / address / website / line-of-business / support contact now come from
  // the merchant profile's merchantBusinessSummary block.
  const { businessProfile, isLoading: isProfileLoading } = useMerchantBusinessProfile();

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

  // registeredName/mid from the session profile (already resolved, so no loading
  // state); tradeName/purposeCode from the /business endpoint; the rest from the
  // merchant profile's merchantBusinessSummary block. An empty value renders as
  // "Not available" in the row below, so none of these need their own fallback.
  const readOnlyFields: BusinessField[] = [
    {
      label: "Legal business name",
      description: "As on your incorporation / GST records.",
      value: profile?.registeredName ?? "",
    },
    {
      label: "Trade name",
      description: "The name customers see, if different from your legal name.",
      value: business?.tradeName ?? "",
      isLoading,
    },
    {
      label: "Merchant ID",
      description: "Your unique PayGlocal merchant identifier.",
      value: profile?.mid ?? "",
    },
    {
      label: "GSTIN",
      description: "15-character GST identification number.",
      value: businessProfile?.gst ?? "",
      isLoading: isProfileLoading,
    },
    {
      label: "Registered address",
      description: "Principal place of business in India.",
      value: businessProfile?.registeredAddress ?? "",
      isLoading: isProfileLoading,
    },
    {
      label: "Business category",
      description: "Helps us tune risk and reporting templates.",
      value: formatLineOfBusiness(businessProfile?.lineOfBusiness),
      isLoading: isProfileLoading,
    },
    {
      label: "Website",
      description: "Your public-facing business website.",
      value: businessProfile?.websiteUrl ?? "",
      isLoading: isProfileLoading,
    },
    {
      label: "Support contact name",
      description: "Person customer queries are addressed to.",
      value: businessProfile?.supportContactName ?? "",
      isLoading: isProfileLoading,
    },
    {
      label: "Support email",
      description: "Where customer queries are directed.",
      value: businessProfile?.supportEmail ?? "",
      isLoading: isProfileLoading,
    },
    {
      label: "Support phone",
      description: "Shown on receipts and payment pages where applicable.",
      value: businessProfile?.supportPhone ?? "",
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
          <h2 className="text-base font-bold text-foreground">Legal & public profile</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Details shown where required for compliance and customer support.
          </p>
        </div>

        <div className="divide-y divide-border px-5">
          {/* Real, editable purpose codes row — the one field on this page that
              takes input, so it is the only one that shows a boxed control, and
              only while actually editing. Label styling matches
              SettingsDetailRow so it reads as part of the same list. */}
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
                  field.value.trim() || "Not available"
                )
              }
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
