import { type Metadata } from "next";
import { ComingSoonFeature } from "@/features/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "EDPMS",
};

export default function EdpmsPage() {
  return (
    <ComingSoonFeature
      title="EDPMS"
      subtitle="Track and close out your Export Data Processing and Monitoring System entries."
    />
  );
}
