import { type Metadata } from "next";
import { PaDeveloperFeature } from "@/features/dashboard/pa-settings/components/PaDeveloperFeature";

export const metadata: Metadata = { title: "Developer" };

export default function PaSettingsDeveloperPage() {
  return <PaDeveloperFeature />;
}
