import { Suspense } from "react";
import { MultiCurrencyFeature } from "@/features/dashboard/multi-currency";

export default function MultiCurrencyPage() {
  // Suspense boundary: this page reads the header search's ?action= handoff via
  // useSearchParams (see useUrlAction), which Next requires be wrapped so the
  // page can still be statically prerendered.
  return (
    <Suspense>
      <MultiCurrencyFeature />
    </Suspense>
  );
}
