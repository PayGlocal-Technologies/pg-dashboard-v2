import { Suspense } from "react";
import { McaLinksFeature } from "@/features/dashboard/mca-links";

export default function McaLinksPage() {
  // Suspense boundary: the table below reads the header search's ?q= handoff
  // via useSearchParams, which Next requires be wrapped so the page can still
  // be statically prerendered.
  return (
    <Suspense>
      <McaLinksFeature />
    </Suspense>
  );
}
