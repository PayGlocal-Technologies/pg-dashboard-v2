"use client";

import { Card, Input, PageHeader, Textarea } from "@/components/ui";
import { useApp } from "@/stores/useApp";

interface BusinessField {
  label: string;
  description: string;
  value: string;
  multiline?: boolean;
}

// TODO(integration): only registeredName/mid come from the real profile,
// everything else here (trade name, purpose code, GSTIN, address, category,
// website, support contact) has no backing endpoint yet and is
// illustrative-only mock data.
function useBusinessFields(): BusinessField[] {
  const profile = useApp((s) => s.profile);
  return [
    {
      label: "Legal business name",
      description: "As on your incorporation / GST records.",
      value: profile?.registeredName ?? "Not available",
    },
    {
      label: "Trade name",
      description: "The name customers see, if different from your legal name.",
      value: "Swig Beverages",
    },
    {
      label: "Merchant ID",
      description: "Your unique PayGlocal merchant identifier.",
      value: profile?.mid ?? "Not available",
    },
    {
      label: "Purpose code",
      description: "RBI purpose code used for cross-border transactions.",
      value: "P0104 - Merchandise Exports",
    },
    {
      label: "GSTIN",
      description: "15-character GST identification number.",
      value: "29ABCDE1234F1Z5",
    },
    {
      label: "Registered address",
      description: "Principal place of business in India.",
      value: "221B, MG Road, Bengaluru, Karnataka 560001, India",
      multiline: true,
    },
    {
      label: "Business category",
      description: "Helps us tune risk and reporting templates.",
      value: "E-commerce - General merchandise",
    },
    {
      label: "Website",
      description: "Your public-facing business website.",
      value: "https://www.swigbeverages.com",
    },
    {
      label: "Support email",
      description: "Where customer queries are directed.",
      value: "support@swigbeverages.com",
    },
    {
      label: "Support phone",
      description: "Shown on receipts and payment pages where applicable.",
      value: "+91 80 4567 8900",
    },
  ];
}

function BusinessFieldRow({ label, description, value, multiline }: BusinessField) {
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div className="max-w-xs">
        <p className="text-sm font-bold text-foreground">{label}</p>
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
  const fields = useBusinessFields();

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
          {fields.map((field) => (
            <BusinessFieldRow key={field.label} {...field} />
          ))}
        </div>
      </Card>
    </div>
  );
}
