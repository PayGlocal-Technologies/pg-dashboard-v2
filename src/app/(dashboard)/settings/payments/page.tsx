import { type Metadata } from "next";
import { PaymentsFeature } from "@/features/dashboard/settings/components/PaymentsFeature";

export const metadata: Metadata = { title: "Payments" };

export default function SettingsPaymentsPage() {
  return <PaymentsFeature />;
}
