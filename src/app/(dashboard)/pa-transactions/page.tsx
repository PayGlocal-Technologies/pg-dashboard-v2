import { Suspense } from "react";
import { PaTransactionsFeature } from "@/features/dashboard/pa-transactions";

export default function PaTransactionsPage() {
  // Suspense boundary: the table below reads the header search's ?q= handoff
  // via useSearchParams, which Next requires be wrapped so the page can still
  // be statically prerendered.
  return (
    <Suspense>
      <PaTransactionsFeature />
    </Suspense>
  );
}
