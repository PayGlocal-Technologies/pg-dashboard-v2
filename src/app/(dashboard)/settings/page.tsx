import { type Metadata } from "next";
import { SettingsFeature } from "@/features/dashboard/settings";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return <SettingsFeature />;
}
