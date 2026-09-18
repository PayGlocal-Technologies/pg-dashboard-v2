import { type Metadata } from "next";
import { ComingSoonFeature } from "@/features/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "eBRC",
};

export default function EbrcPage() {
  return (
    <ComingSoonFeature
      title="eBRC"
      subtitle="Electronic Bank Realisation Certificates for your export receipts."
    />
  );
}
