import { Suspense } from "react";
import { McaReceiptsFeature } from "@/features/dashboard/mca-receipts";

export default function ReceiptsPage() {
  // Suspense boundary: the table below reads the header search's ?q= handoff
  // via useSearchParams, which Next requires be wrapped so the page can still
  // be statically prerendered.
  return (
    <Suspense>
      <McaReceiptsFeature />
    </Suspense>
  );
}
