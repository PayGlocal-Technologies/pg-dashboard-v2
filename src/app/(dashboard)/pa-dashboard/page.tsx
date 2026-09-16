import { type Metadata } from "next";
import { DashboardHomeFeature } from "@/features/dashboard/home";

export const metadata: Metadata = {
  title: "Payments Dashboard",
};

// TODO(integration): for now this is a straight replica of the Home dashboard
// (/dashboard). Home's shows combined Payments + MCA data, this one should
// eventually show ONLY Payments (PA) data, once DashboardHomeFeature's
// children take their data via props instead of importing home/mock-data.ts at
// module scope (TodaysAnalyticsSection and DashboardWidgetRenderer especially).
export default function PaDashboardPage() {
  return <DashboardHomeFeature />;
}
