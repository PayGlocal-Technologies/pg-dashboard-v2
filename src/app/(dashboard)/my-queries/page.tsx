import { Suspense } from "react";
import { type Metadata } from "next";
import { MyQueriesFeature } from "@/features/dashboard/support-tickets";

export const metadata: Metadata = { title: "My queries" };

export default function MyQueriesPage() {
  // Suspense boundary: this page reads the header search's ?action= handoff via
  // useSearchParams (see useUrlAction), which Next requires be wrapped so the
  // page can still be statically prerendered.
  return (
    <Suspense>
      <MyQueriesFeature />
    </Suspense>
  );
}
