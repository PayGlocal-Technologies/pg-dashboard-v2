import { type Metadata } from "next";
import { SchedulerFeature } from "@/features/dashboard/scheduler";

export const metadata: Metadata = {
  title: "Scheduler",
};

export default function SchedulerPage() {
  return <SchedulerFeature />;
}
