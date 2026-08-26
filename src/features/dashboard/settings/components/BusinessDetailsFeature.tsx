"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge, Button, Card, Input, PageHeader, Shimmer, Textarea } from "@/components/ui";
import { useApp } from "@/stores/useApp";
import {
  useBusinessDetails,
  useUpdateBusinessDetails,
} from "@/features/dashboard/settings/hooks";

interface BusinessField {
  label: string;
  description: string;
  value: string;
  multiline?: boolean;
  /** True for fields with no backing endpoint yet — kept as illustrative mock
   *  data and flagged, per the "keep UI, mark BACKEND GAP" decision. */
  gap?: boolean;
}

function BusinessFieldRow({ label, description, value, multiline, gap }: BusinessField) {
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div className="max-w-xs">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-foreground">{label}</p>
          {gap && (
            <Badge variant="secondary" size="sm">
              Not available yet
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="w-full max-w-md">
        {multiline ? (
          <Textarea
            value={value}
            readOnly
            rows={2}
            className="resize-none text-[13px] font-medium text-foreground"
          />
        ) : (
          <Input value={value} readOnly className="text-[13px] font-medium text-foreground" />
        )}
      </div>
    </div>
  );
}

export function BusinessDetailsFeature() {
  const profile = useApp((s) => s.profile);
  const { business, isLoading } = useBusinessDetails();
  const { updateBusiness, isSaving } = useUpdateBusinessDetails();

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
        onError: (err: Error) =>
          toast.error(err.message || "Failed to update business details."),
      }
    );
  };

  // Only registeredName/mid come from the session profile; tradeName and
  // purposeCode now come from the real /business endpoint. Everything below the
  // divider has no endpoint yet — kept as illustrative mock and flagged `gap`.
  const readOnlyFields: BusinessField[] = [
    {
      label: "Legal business name",
      description: "As on your incorporation / GST records.",
      value: profile?.registeredName ?? "Not available",
    },
    {
      label: "Trade name",
      description: "The name customers see, if different from your legal name.",
      value: isLoading ? "" : business?.tradeName ?? "Not available",
    },
    {
      label: "Merchant ID",
      description: "Your unique PayGlocal merchant identifier.",
      value: profile?.mid ?? "Not available",
    },
    // BACKEND GAP — no endpoint returns these; illustrative-only mock values.
    {
      label: "GSTIN",
      description: "15-character GST identification number.",
      value: "29ABCDE1234F1Z5",
      gap: true,
    },
    {
      label: "Registered address",
      description: "Principal place of business in India.",
      value: "221B, MG Road, Bengaluru, Karnataka 560001, India",
      multiline: true,
      gap: true,
    },
    {
      label: "Business category",
      description: "Helps us tune risk and reporting templates.",
      value: "E-commerce - General merchandise",
      gap: true,
    },
    {
      label: "Website",
      description: "Your public-facing business website.",
      value: "https://www.swigbeverages.com",
      gap: true,
    },
    {
      label: "Support email",
      description: "Where customer queries are directed.",
      value: "support@swigbeverages.com",
      gap: true,
    },
    {
      label: "Support phone",
      description: "Shown on receipts and payment pages where applicable.",
      value: "+91 80 4567 8900",
      gap: true,
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
          {/* Real, editable purpose codes row. */}
          <div className="flex items-start justify-between gap-6 py-4">
            <div className="max-w-xs">
              <p className="text-sm font-bold text-foreground">Purpose code(s)</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                RBI purpose codes used for cross-border transactions.
              </p>
            </div>
            <div className="w-full max-w-md">
              {editing ? (
                <div className="space-y-2">
                  <Input
                    value={codesInput}
                    onChange={(e) => setCodesInput(e.target.value)}
                    placeholder="e.g. P0104, P0802"
                    className="text-[13px] font-medium text-foreground"
                  />
                  <p className="text-[11px] text-muted-foreground">Separate multiple codes with commas.</p>
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
                <div className="flex items-center justify-between gap-3">
                  {isLoading ? (
                    <Shimmer className="h-5 w-40" />
                  ) : (
                    <span className="text-[13px] font-medium text-foreground">
                      {purposeCodes.length ? purposeCodes.join(", ") : "Not set"}
                    </span>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={startEditing}>
                    Edit
                  </Button>
                </div>
              )}
            </div>
          </div>

          {readOnlyFields.map((field) => (
            <BusinessFieldRow key={field.label} {...field} />
          ))}
        </div>
      </Card>
    </div>
  );
}
