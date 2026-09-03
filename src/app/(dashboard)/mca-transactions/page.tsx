import { Suspense } from "react";
import { McaTransactionsFeature } from "@/features/dashboard/mca-transactions";

export default function McaTransactionsPage() {
  // Suspense boundary: the table below reads the header search's ?q= handoff
  // via useSearchParams, which Next requires be wrapped so the page can still
  // be statically prerendered.
  return (
    <Suspense>
      <McaTransactionsFeature />
    </Suspense>
  );
}
