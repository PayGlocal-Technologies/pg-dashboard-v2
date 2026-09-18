import { type Metadata } from "next";
import { ReferAndEarnFeature } from "@/features/dashboard/refer-and-earn";

export const metadata: Metadata = {
  title: "Refer and Earn",
};

export default function ReferAndEarnPage() {
  return <ReferAndEarnFeature />;
}
