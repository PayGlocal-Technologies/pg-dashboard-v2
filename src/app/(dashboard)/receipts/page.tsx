import { Suspense } from "react";
import { ReceiptsFeature } from "@/features/dashboard/receipts";

export default function ReceiptsPage() {
  // Suspense boundary: the table below reads the header search's ?q= handoff
  // via useSearchParams, which Next requires be wrapped so the page can still
  // be statically prerendered.
  return (
    <Suspense>
      <ReceiptsFeature />
    </Suspense>
  );
}
