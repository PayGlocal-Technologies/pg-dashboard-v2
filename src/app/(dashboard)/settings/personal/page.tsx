import { type Metadata } from "next";
import { PersonalDetailsFeature } from "@/features/dashboard/settings/components/PersonalDetailsFeature";

export const metadata: Metadata = { title: "Personal Details" };

export default function PersonalDetailsPage() {
  return <PersonalDetailsFeature />;
}
