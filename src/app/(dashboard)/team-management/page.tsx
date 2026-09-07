import { Suspense } from "react";
import { TeamManagementFeature } from "@/features/dashboard/team-management";

export default function TeamManagementPage() {
  // Suspense boundary: this page reads the header search's ?action= handoff via
  // useSearchParams (see useUrlAction), which Next requires be wrapped so the
  // page can still be statically prerendered.
  return (
    <Suspense>
      <TeamManagementFeature />
    </Suspense>
  );
}
