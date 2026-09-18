import { Suspense } from "react";
import { SkuManagementFeature } from "@/features/dashboard/sku-management";

export default function SkuManagementPage() {
  // Suspense boundary: this page reads the header search's ?action= handoff via
  // useSearchParams (see useUrlAction), which Next requires be wrapped so the
  // page can still be statically prerendered.
  return (
    <Suspense>
      <SkuManagementFeature />
    </Suspense>
  );
}
