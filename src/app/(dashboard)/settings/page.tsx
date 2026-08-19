import { type Metadata } from "next";
import { ComingSoonFeature } from "@/features/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <ComingSoonFeature title="Settings" subtitle="Manage your account, team and preferences." />
  );
}
