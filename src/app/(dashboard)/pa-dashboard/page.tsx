import { type Metadata } from "next";
import { PaDashboardFeature } from "@/features/dashboard/home";

export const metadata: Metadata = {
  title: "Payments Dashboard",
};

// Greeting and Recent activity only, see PaDashboardFeature: the
// Home dashboard's analytics and widgets run on mock figures.
export default function PaDashboardPage() {
  return <PaDashboardFeature />;
}
