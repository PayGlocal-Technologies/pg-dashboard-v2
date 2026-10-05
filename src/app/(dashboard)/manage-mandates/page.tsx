import { Suspense } from "react";
import { type Metadata } from "next";
import { ManageMandatesFeature } from "@/features/dashboard/manage-mandates";

export const metadata: Metadata = {
  title: "Manage Mandates",
};

// Suspense because the table reads ?q= (global search's hand-off) through
// useSearchParams.
export default function ManageMandatesPage() {
  return (
    <Suspense>
      <ManageMandatesFeature />
    </Suspense>
  );
}
