"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { ClientDetailsContent } from "@/features/dashboard/client-management/components/ClientDetailsContent";
import { ClientInvoicesSection } from "@/features/dashboard/client-management/components/ClientInvoicesSection";
import { useClientContractView } from "@/features/dashboard/client-management/hooks";
import type { Client } from "@/features/dashboard/client-management/types";

interface ClientDetailsPageProps {
  client: Client;
  onBack: () => void;
  /** Closes the full page and reopens the same client in the drawer. */
  onCollapse: () => void;
}

/**
 * Full-page client detail view — replaces the Client Management table in place
 * (see ClientTable) rather than overlaying it, so this renders as a plain
 * page: no portal, no backdrop, no open/close animation, exactly as
 * TransactionDetailsPage does. Back and Collapse are the only navigation
 * affordances, and the caller keeps the table's own search/filter/page state
 * alive since switching back just swaps which JSX shares a parent, no unmount
 * involved.
 *
 * The sections themselves live in ClientDetailsContent, shared verbatim with
 * ClientDetailsDrawer. This wrapper adds the page's Back navigation and composes
 * the invoice ledger, which needs the status filter state the KPI cards drive.
 */
export function ClientDetailsPage({ client, onBack, onCollapse }: ClientDetailsPageProps) {
  // Which invoice statuses the ledger is narrowed to. Held here rather than in
  // the ledger because the KPI cards above it are what set it, and they live in a
  // different subtree.
  const [invoiceStatuses, setInvoiceStatuses] = useState<string[]>([]);
  const { viewContract } = useClientContractView();

  return (
    <div>
      {/* Back/Collapse only, both left-aligned and adjacent to each other —
          same controls, icons, order, and spacing as the expanded Transaction
          Details page's own header row. */}
      <div className="mb-2 flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={<Icon name="chevron-left" className="h-4 w-4" />}
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground"
        >
          Back to Clients
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={<Icon name="shrink" className="h-4 w-4" />}
          onClick={onCollapse}
          className="text-muted-foreground hover:text-foreground"
        >
          Collapse
        </Button>
      </div>

      <ClientDetailsContent
        client={client}
        layout="page"
        // Pressing a KPI card narrows the ledger to the statuses that card
        // counts, which is the whole reason the cards are clickable — the figure
        // and the rows behind it end up on screen together.
        onFilterByStatus={setInvoiceStatuses}
        onViewContract={
          client.contract?.fileId
            ? () => viewContract({ clientId: client.id, rowMid: client.mid })
            : undefined
        }
        ledgerSlot={
          <ClientInvoicesSection
            clientId={client.id}
            statuses={invoiceStatuses}
            onStatusesChange={setInvoiceStatuses}
          />
        }
      />
    </div>
  );
}
