import { Suspense } from "react";
import { ClientManagementFeature } from "@/features/dashboard/client-management";

export default function ClientManagementPage() {
  // Suspense boundary: this page reads the header search's ?action= handoff via
  // useSearchParams (see useUrlAction), which Next requires be wrapped so the
  // page can still be statically prerendered.
  return (
    <Suspense>
      <ClientManagementFeature />
    </Suspense>
  );
}
