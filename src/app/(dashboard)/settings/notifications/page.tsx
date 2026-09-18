import { type Metadata } from "next";
import { NotificationsFeature } from "@/features/dashboard/settings/components/NotificationsFeature";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return <NotificationsFeature />;
}
