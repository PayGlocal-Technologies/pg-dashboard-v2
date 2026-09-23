import { type Metadata } from "next";
import { IrmRepositoryFeature } from "@/features/dashboard/irm-repository";

export const metadata: Metadata = {
  title: "IRM Repository",
};

export default function IrmRepositoryPage() {
  return <IrmRepositoryFeature />;
}
