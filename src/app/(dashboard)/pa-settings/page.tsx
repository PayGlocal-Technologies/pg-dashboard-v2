import { redirect } from "next/navigation";

/** /pa-settings has no landing page of its own: the section starts at the
 * first page in its left nav, as /settings does. */
export default function PaSettingsPage() {
  redirect("/pa-settings/personal");
}
