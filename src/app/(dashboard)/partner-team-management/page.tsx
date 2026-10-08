import { Suspense } from "react";
import { type Metadata } from "next";
import { TeamManagementFeature } from "@/features/dashboard/team-management";

export const metadata: Metadata = { title: "Team Management" };

/** Partners → Team Management: the team management page, on a sample
 *  reseller team (DESIGN MOCK, see team-management/partnerDemo.ts). */
export default function PartnerTeamManagementPage() {
  // Suspense boundary: the feature reads ?action= via useSearchParams.
  return (
    <Suspense>
      <TeamManagementFeature demo />
    </Suspense>
  );
}
