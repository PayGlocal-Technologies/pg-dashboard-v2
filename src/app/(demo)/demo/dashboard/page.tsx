import { type Metadata } from "next";
import { DashboardHomeFeature } from "@/features/dashboard/home";

export const metadata: Metadata = {
  title: "Dashboard",
};

/** DEMO: the Home dashboard on sample data, opened by the mock sign-up. */
export default function DemoDashboardPage() {
  return <DashboardHomeFeature />;
}
