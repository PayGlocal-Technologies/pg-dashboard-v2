import { type Metadata } from "next";
import { DashboardHomeFeature } from "@/features/dashboard/home";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return <DashboardHomeFeature />;
}
