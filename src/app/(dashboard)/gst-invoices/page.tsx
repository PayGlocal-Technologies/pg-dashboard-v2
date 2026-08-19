import { type Metadata } from "next";
import { ComingSoonFeature } from "@/features/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "GST Invoices",
};

export default function GstInvoicesPage() {
  return (
    <ComingSoonFeature
      title="GST Invoices"
      subtitle="GST invoices raised against your settlements."
    />
  );
}
