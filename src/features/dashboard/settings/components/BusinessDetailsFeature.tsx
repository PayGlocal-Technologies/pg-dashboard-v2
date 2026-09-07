"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, Card, PageHeader, Shimmer } from "@/components/ui";
import { useApp } from "@/stores/useApp";
import { PurposeCodeCombobox } from "@/components/common/PurposeCodeCombobox";
import { NO_DESCRIPTION, PURPOSE_CODES } from "@/lib/purposeCodes";
import { SettingsDetailRow } from "@/features/dashboard/settings/components/SettingsDetailRow";
import {
  useBusinessDetails,
  useMerchantBusinessProfile,
  usePurposeCodeOptions,
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

/** Trims, upper-cases and de-duplicates a list of purpose codes, keeping the
 *  order the API sent them in. */
function uniqueCodes(codes: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of codes) {
    const code = raw?.trim().toUpperCase();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    result.push(code);
  }
  return result;
}

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

  // The purpose code is the one editable field on this page. It used to be a
  // free-text box taking a comma-separated list; it is now a single-select over
  // the codes the API offers, so a merchant can hold exactly one code going
  // forward. Accounts configured before this still read back several, which the
  // read view lists in full and the editor makes explicit before replacing.
  // Deduped and normalised: the endpoint really does return the same code more
  // than once on some accounts (and in mixed case), which would otherwise list
  // it twice under duplicate React keys and inflate the "N purpose codes"
  // count in the replace warning below.
  const purposeCodes = uniqueCodes(business?.purposeCode ?? []);
  const hasLegacyMultiple = purposeCodes.length > 1;
  const [editing, setEditing] = useState(false);
  const [selectedCode, setSelectedCode] = useState("");
  // The saved codes are folded into the option list so an existing one the API
  // no longer offers is still selectable rather than silently absent.
  const { options: purposeCodeOptions, isLoading: isOptionsLoading } =
    usePurposeCodeOptions(purposeCodes);

  // The API's own wording for a code wins (it is the list this merchant was
  // offered), then the static RBI table. Neither knowing it returns empty so
  // the caller can drop the line rather than print a placeholder.
  const describeCode = (code: string): string => {
    const upper = code.toUpperCase();
    const fromOptions = purposeCodeOptions.find((option) => option.code === upper)?.description;
    if (fromOptions && fromOptions !== NO_DESCRIPTION) return fromOptions;
    return PURPOSE_CODES[upper] ?? "";
  };

  const startEditing = (): void => {
    // A single saved code is the obvious starting selection. With several there
    // is no defensible pick, so the field starts empty and the merchant chooses
    // which one the account keeps.
    setSelectedCode(hasLegacyMultiple ? "" : (purposeCodes[0] ?? ""));
    setEditing(true);
  };

  const saveCodes = (): void => {
    if (!selectedCode) return;

    // The endpoint still takes the plural array pg-dashboard sends; we just
    // never send more than one entry.
    updateBusiness(
      { purposeCodes: [selectedCode] },
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
          {/* Real, editable purpose code row — the one field on this page that
              takes input, so it is the only one that shows a boxed control, and
              only while actually editing. Label styling matches
              SettingsDetailRow so it reads as part of the same list. */}
          <div className="flex items-start justify-between gap-6 py-3">
            <div className="max-w-xs">
              <p className="text-sm text-muted-foreground">Purpose code</p>
              <p className="mt-0.5 text-xs text-muted-foreground/70">
                RBI purpose code used for cross-border transactions.
              </p>
            </div>
            {editing ? (
              <div className="w-full max-w-md space-y-2">
                <PurposeCodeCombobox
                  id="business-purpose-code"
                  value={selectedCode}
                  onChange={setSelectedCode}
                  options={purposeCodeOptions}
                  isLoading={isOptionsLoading}
                />
                {hasLegacyMultiple ? (
                  <p className="text-[11px] text-destructive">
                    This account currently holds {purposeCodes.length} purpose codes (
                    {purposeCodes.join(", ")}). Accounts now carry a single code, so saving replaces
                    all of them with the one you pick here.
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    One code per account. Search by code or by what it covers.
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={saveCodes}
                    isLoading={isSaving}
                    disabled={!selectedCode}
                  >
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
              <div className="flex items-start gap-3">
                {isLoading ? (
                  <Shimmer className="h-4 w-40" />
                ) : purposeCodes.length ? (
                  // Every saved code is listed, not just the first: an account
                  // configured before the single-code rule still has several and
                  // hiding the extras would misreport what it is set to.
                  <div className="space-y-1 text-right">
                    {purposeCodes.map((code) => {
                      const description = describeCode(code);
                      return (
                        <div key={code}>
                          <span className="text-sm font-semibold text-foreground">{code}</span>
                          {description && (
                            <p className="text-xs text-muted-foreground">{description}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-foreground">Not set</span>
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
