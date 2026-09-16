import { Suspense } from "react";
import { InternationalAccounts2Feature } from "@/features/dashboard/multi-currency-2";

export default function MultiCurrency2Page() {
  // Suspense boundary: this page reads the header search's ?action= handoff via
  // useSearchParams (see useUrlAction), which Next requires be wrapped so the
  // page can still be statically prerendered.
  return (
    <Suspense>
      <InternationalAccounts2Feature />
    </Suspense>
  );
}
