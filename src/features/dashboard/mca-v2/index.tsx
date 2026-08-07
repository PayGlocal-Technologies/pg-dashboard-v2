"use client";

import { EmptyState, PageHeader } from "@/components/ui";

// Placeholder Products page: MCA v2 has no real functionality yet, so the
// sidebar entry (Payment Products > MCA v2) just lands on the same
// PageHeader + EmptyState shell other not-yet-built pages in this section
// would use, rather than 404ing.
export function McaV2Feature() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      <PageHeader title="MCA v2" />
      <div className="rounded-xl border border-border bg-card">
        <EmptyState title="Coming soon" description="MCA v2 is not yet available." />
      </div>
    </div>
  );
}
