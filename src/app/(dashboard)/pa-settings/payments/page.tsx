import { type Metadata } from "next";
import { PaPaymentsFeature } from "@/features/dashboard/pa-settings/components/PaPaymentsFeature";

export const metadata: Metadata = { title: "Payments" };

export default function PaSettingsPaymentsPage() {
  return <PaPaymentsFeature />;
}
