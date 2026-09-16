import { type Metadata } from "next";
import { BankingFeature } from "@/features/dashboard/settings/components/BankingFeature";

export const metadata: Metadata = { title: "Banking & Currencies" };

export default function BankingPage() {
  return <BankingFeature />;
}
