"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { useApp } from "@/stores/useApp";
import { ClientDetailsContent } from "@/features/dashboard/client-management/components/ClientDetailsContent";
import { ClientTransactionsSection } from "@/features/dashboard/client-management/components/ClientTransactionsSection";
import { ClientInvoicesSection } from "@/features/dashboard/client-management/components/ClientInvoicesSection";
import { useClientContractView } from "@/features/dashboard/client-management/hooks";
import { TransactionDetailsDrawer } from "@/features/dashboard/mca-transactions/components/TransactionDetailsDrawer";
import { TransactionDetailsPage } from "@/features/dashboard/mca-transactions/components/TransactionDetailsPage";
import type { Client } from "@/features/dashboard/client-management/types";
import type { McaTransaction } from "@/features/dashboard/mca-transactions/types";

interface ClientDetailsPageProps {
  client: Client;
  onBack: () => void;
  /** Closes the full page and reopens the same client in the drawer. */
  onCollapse: () => void;
  /**
   * A transaction to open expanded as soon as this page mounts — set when
   * Expand was pressed on a transaction inside the client drawer, which has
   * nowhere to show a full-page transaction itself (see
   * ClientDetailsDrawer's onExpandTransaction). Null for an ordinary expand.
   */
  /** The transaction to open expanded on mount, when the merchant expanded one
   *  from inside the client drawer. The row itself rather than its id: with the
   *  transactions server-paged there is no local list to look an id up in. */
  initialTransaction?: McaTransaction | null;
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
 * ClientDetailsDrawer. This wrapper adds the page's Back navigation, the
 * transactions section (which needs interaction state the drawer has no use
 * for), and the transaction detail views those rows open.
 */
export function ClientDetailsPage({
  client,
  onBack,
  onCollapse,
  initialTransaction = null,
}: ClientDetailsPageProps) {
  const isPartnerUser = useApp((s) => s.isPartnerUser);

  // The transaction opened from this client's transactions section. Mirrors
  // McaTransactionTable's own arrangement exactly: a row click opens the
  // drawer, Expand hands that same transaction to the full page, and the two
  // are mutually exclusive.
  //
  // Both seed from initialTransaction, which is only ever read on mount —
  // correct here because the caller mounts this component fresh on every
  // expand (see ClientTable's early return), so a later expand of a different
  // transaction arrives as a new mount rather than a prop change to reconcile.
  // Which invoice statuses the ledger is narrowed to. Held here rather than in
  // the ledger because the KPI cards above it are what set it, and they live in a
  // different subtree.
  const [invoiceStatuses, setInvoiceStatuses] = useState<string[]>([]);
  const { viewContract } = useClientContractView();

  const [txnRow, setTxnRow] = useState<McaTransaction | null>(initialTransaction);
  const [txnDrawerOpen, setTxnDrawerOpen] = useState(false);
  const [txnPageOpen, setTxnPageOpen] = useState(initialTransaction != null);

  const openTransaction = (row: McaTransaction) => {
    setTxnRow(row);
    setTxnDrawerOpen(true);
  };

  // Expanding a transaction from inside this page swaps it for the existing
  // Transaction Details page, whose Back returns here — the same in-place
  // swap the Transactions table performs, reusing that view untouched rather
  // than nesting a second copy of it inside this one.
  if (txnPageOpen && txnRow) {
    return (
      <TransactionDetailsPage
        row={txnRow}
        onBack={() => setTxnPageOpen(false)}
        onCollapse={() => {
          setTxnPageOpen(false);
          setTxnDrawerOpen(true);
        }}
        onOpenTransaction={openTransaction}
        isPartnerUser={isPartnerUser}
        backLabel={`Back to ${client.businessName}`}
      />
    );
  }

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
        transactionsSlot={
          <ClientTransactionsSection
            businessName={client.businessName}
            isPartnerUser={isPartnerUser}
            onOpenTransaction={openTransaction}
          />
        }
      />

      {/* The existing Transaction Details drawer, unchanged: rendered
          alongside this page (not in place of it) so closing it leaves the
          client view exactly as it was. */}
      <TransactionDetailsDrawer
        row={txnRow}
        open={txnDrawerOpen}
        onOpenChange={setTxnDrawerOpen}
        onExpand={() => {
          setTxnDrawerOpen(false);
          setTxnPageOpen(true);
        }}
        onOpenTransaction={openTransaction}
        isPartnerUser={isPartnerUser}
      />
    </div>
  );
}
