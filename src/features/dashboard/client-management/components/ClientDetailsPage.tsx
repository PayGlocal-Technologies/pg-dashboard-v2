"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { useApp } from "@/stores/useApp";
import { ClientDetailsContent } from "@/features/dashboard/client-management/components/ClientDetailsContent";
import { ClientTransactionsSection } from "@/features/dashboard/client-management/components/ClientTransactionsSection";
import { TransactionDetailsDrawer } from "@/features/dashboard/transactions/components/TransactionDetailsDrawer";
import { TransactionDetailsPage } from "@/features/dashboard/transactions/components/TransactionDetailsPage";
import { clientTransactions } from "@/features/dashboard/client-management/mock-data";
import type { Client } from "@/features/dashboard/client-management/types";
import type { McaTransaction } from "@/features/dashboard/transactions/types";

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
 * ClientDetailsDrawer. This wrapper adds the page's Back navigation, the
 * transactions section (which needs interaction state the drawer has no use
 * for), and the transaction detail views those rows open.
 */
export function ClientDetailsPage({ client, onBack, onCollapse }: ClientDetailsPageProps) {
  const isPartnerUser = useApp((s) => s.isPartnerUser);

  // The transaction opened from this client's transactions section. Mirrors
  // McaTransactionTable's own arrangement exactly: a row click opens the
  // drawer, Expand hands that same transaction to the full page, and the two
  // are mutually exclusive.
  const [txnId, setTxnId] = useState<string | null>(null);
  const [txnDrawerOpen, setTxnDrawerOpen] = useState(false);
  const [txnPageOpen, setTxnPageOpen] = useState(false);
  // Owned here rather than by the drawer or the transaction page, since
  // Expand/Collapse swap those two in and out of the tree and state either
  // held locally would be lost the moment the other took over.
  const [resolvedFeedbackIds, setResolvedFeedbackIds] = useState<Set<string>>(() => new Set());

  const txnRow = clientTransactions(client.businessName).find((t) => t.gid === txnId) ?? null;

  const openTransaction = (row: McaTransaction) => {
    setTxnId(row.gid);
    setTxnDrawerOpen(true);
  };

  const handleFeedbackResolved = (gid: string) => {
    setResolvedFeedbackIds((prev) => new Set(prev).add(gid));
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
        resolvedFeedbackIds={resolvedFeedbackIds}
        onFeedbackResolved={handleFeedbackResolved}
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
        resolvedFeedbackIds={resolvedFeedbackIds}
        onFeedbackResolved={handleFeedbackResolved}
      />
    </div>
  );
}
