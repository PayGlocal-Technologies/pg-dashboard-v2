import { type Metadata } from "next";
import { SettingsOverviewFeature } from "@/features/dashboard/settings/components/SettingsOverviewFeature";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return <SettingsOverviewFeature />;
}
