import { EmptyState, PageHeader } from "@/components/ui";

/**
 * Placeholder for the MCA nav entries whose pages have not been built yet
 * (International Accounts, Connect Platforms, eBRC, EDPMS, GST Invoices and
 * Settings). The MCA navigation tree ships the full intended information
 * architecture, so these routes exist purely to keep every sidebar item
 * clickable instead of 404-ing until the real feature lands.
 */
export function ComingSoonFeature({
  title,
  subtitle,
  description,
}: {
  title: string;
  subtitle?: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <PageHeader title={title} subtitle={subtitle} />
      <EmptyState
        title="Coming soon"
        description={
          description ?? `${title} is not available yet. It will appear here once released.`
        }
      />
    </div>
  );
}
