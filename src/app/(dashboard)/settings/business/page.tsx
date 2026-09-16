import { type Metadata } from "next";
import { BusinessDetailsFeature } from "@/features/dashboard/settings/components/BusinessDetailsFeature";

export const metadata: Metadata = { title: "Business Details" };

export default function BusinessDetailsPage() {
  return <BusinessDetailsFeature />;
}
