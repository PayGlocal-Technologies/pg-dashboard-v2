import { redirect } from "next/navigation";

// "Developer" itself is a nav group, not a page, see SettingsSidebar's
// expandable-parent handling, API keys is the default child.
export default function DeveloperPage() {
  redirect("/settings/developer/api-keys");
}
