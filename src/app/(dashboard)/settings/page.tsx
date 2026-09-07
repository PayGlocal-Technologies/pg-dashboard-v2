import { redirect } from "next/navigation";

/** /settings has no landing page of its own: the section starts at the first
 * page in the left nav. The route stays so existing links (the sidebar footer's
 * gear icon, the Home nav's Settings item) keep working. */
export default function SettingsPage() {
  redirect("/settings/personal");
}
