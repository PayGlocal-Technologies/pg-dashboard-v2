"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Button,
  DataTableCard,
  IconButton,
  PageHeader,
  StatusBadge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  type Column,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { CopyableCell } from "@/components/common/CopyableCell";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { cn } from "@/lib/utils";
import {
  KIND_META,
  KIND_ORDER,
  MOCK_KEYS,
  type KeyKind,
  type PartnerKey,
} from "@/features/dashboard/partner-keys/mock-data";
import { RevokeKeyDialog } from "@/features/dashboard/partner-keys/components/RevokeKeyDialog";
import {
  GeneratedKeyDialog,
  type GeneratedKey,
} from "@/features/dashboard/partner-keys/components/GeneratedKeyDialog";

const columns: Column<PartnerKey>[] = [
  {
    key: "kid",
    header: "Key ID",
    minWidth: 220,
    cellClassName: "pl-5",
    render: (row) =>
      row.type === "RSA_PUBCERT" ? (
        <span className="text-[13px] font-medium text-foreground">{row.kid}</span>
      ) : (
        <CopyableCell value={row.kid} label="Key ID" monospace />
      ),
  },
  {
    key: "status",
    header: "Status",
    minWidth: 110,
    render: (row) =>
      row.status === "ACTIVE" ? (
        <StatusBadge variant="success" label="Active" trailIcon="check" size="sm" />
      ) : (
        <StatusBadge variant="muted" label="Revoked" trailIcon="x" size="sm" />
      ),
  },
  {
    key: "generatedOn",
    header: "Generated on",
    minWidth: 160,
    render: (row) => (
      <span className="whitespace-nowrap text-[13px] text-muted-foreground">
        {row.generatedOn ?? "—"}
      </span>
    ),
  },
  {
    key: "expiresOn",
    header: "Expires on",
    minWidth: 160,
    render: (row) => (
      <span className="whitespace-nowrap text-[13px] text-muted-foreground">
        {row.expiresOn ?? "—"}
      </span>
    ),
  },
  {
    key: "type",
    header: "Type",
    minWidth: 120,
    render: (row) => (
      <span className="font-mono text-[12.5px] text-muted-foreground">{row.type}</span>
    ),
  },
];

/** A fresh placeholder key ID; the counter keeps them distinct in a session. */
function nextKid(kind: KeyKind, n: number) {
  return `kid-demo-${kind === "rsa" ? "rsa" : "api"}-${String(n).padStart(4, "0")}`;
}

/**
 * DESIGN MOCK: Partners → Key Management. The three kinds of credential are
 * laid out side by side as selectable cards (what each is for, and how many
 * are active), instead of hidden behind a Key Type dropdown; the selected
 * kind's keys and its own action sit below.
 */
export function PartnerKeyManagementFeature() {
  const [kind, setKind] = useState<KeyKind>("certificate");
  const [keys, setKeys] = useState(MOCK_KEYS);
  const [revoking, setRevoking] = useState<PartnerKey | null>(null);
  const [generated, setGenerated] = useState<GeneratedKey | null>(null);
  const [busy, setBusy] = useState<"refresh" | "generate" | null>(null);
  const counter = useRef(10);
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  const meta = KIND_META[kind];
  const rows = keys[kind];

  /** MOCK: a short wait standing in for the request. */
  function later(fn: () => void) {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(fn, 600);
  }

  function refresh() {
    setBusy("refresh");
    later(() => {
      setBusy(null);
      toast.success(`${meta.label} up to date`);
    });
  }

  function generate() {
    if (kind === "certificate") {
      toast.message("Certificate download isn't connected yet", {
        description: "In the live page this downloads PayGlocal's public certificate.",
      });
      return;
    }
    setBusy("generate");
    const target = kind;
    later(() => {
      counter.current += 1;
      const kid = nextKid(target, counter.current);
      setKeys((prev) => ({
        ...prev,
        [target]: [
          {
            kid,
            status: "ACTIVE",
            generatedOn: "Just now",
            expiresOn: target === "rsa" ? "In 3 years" : "In 6 months",
            type: target === "rsa" ? "RSA" : "API_KEY",
          },
          ...prev[target],
        ],
      }));
      setBusy(null);
      setGenerated({ kind: target, kid });
    });
  }

  function confirmRevoke() {
    const row = revoking;
    if (!row) return;
    setKeys((prev) => ({
      ...prev,
      [kind]: prev[kind].map((k) => (k.kid === row.kid ? { ...k, status: "REVOKED" } : k)),
    }));
    toast.success("Key revoked");
  }

  const actionLabel =
    kind === "certificate"
      ? "Download certificate"
      : kind === "rsa"
        ? "Generate RSA key"
        : "Generate API key";

  return (
    <div className="page-enter mx-auto max-w-[1400px] space-y-5">
      <PageHeader
        title="Key Management"
        subtitle="Keys and certificates your integration uses to encrypt and authenticate its API requests"
      />

      {/* The three kinds, all visible at once: pick one to see its keys. */}
      <div role="tablist" aria-label="Key type" className="grid gap-3 sm:grid-cols-3">
        {KIND_ORDER.map((k) => {
          const m = KIND_META[k];
          const active = keys[k].filter((x) => x.status === "ACTIVE").length;
          const selected = k === kind;
          return (
            <Button
              key={k}
              type="button"
              role="tab"
              aria-selected={selected}
              variant="outline"
              onClick={() => setKind(k)}
              className={cn(
                "group h-auto min-h-0 w-full items-start justify-start rounded-xl p-4 text-left whitespace-normal shadow-none transition-colors",
                "[&>span]:flex [&>span]:w-full [&>span]:items-start [&>span]:gap-3",
                selected
                  ? "border-primary bg-primary/5 ring-1 ring-primary hover:bg-primary/5"
                  : "hover:border-primary/40 hover:bg-muted/40"
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground/70 group-hover:text-primary"
                )}
              >
                <Icon name={m.icon} size={18} aria-hidden />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground">{m.label}</span>
                  {selected && (
                    <Icon name="check-circle" size={16} aria-hidden className="text-primary" />
                  )}
                </span>
                <span className="text-xs font-normal leading-relaxed text-muted-foreground">
                  {m.purpose}
                </span>
                <span className="mt-1 text-xs font-medium text-foreground/80">
                  {active} {active === 1 ? m.unit[0] : m.unit[1]}
                </span>
              </span>
            </Button>
          );
        })}
      </div>

      <DataTableCard<PartnerKey>
        className="shadow-none"
        toolbar={
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Icon name={meta.icon} size={16} aria-hidden className="text-primary" />
                {meta.label}
              </h2>
              <p className="mt-0.5 max-w-2xl text-[13px] text-muted-foreground">
                {meta.description}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={
                  <Icon
                    name="refresh"
                    className={cn("h-3.5 w-3.5", busy === "refresh" && "animate-spin")}
                  />
                }
                onClick={refresh}
                disabled={busy !== null}
                className="shadow-none"
              >
                Refresh
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                leftIcon={
                  <Icon
                    name={kind === "certificate" ? "download" : "plus"}
                    className="h-3.5 w-3.5"
                  />
                }
                isLoading={busy === "generate"}
                disabled={busy === "refresh"}
                onClick={generate}
              >
                {actionLabel}
              </Button>
            </div>
          </div>
        }
        columns={columns}
        data={rows}
        rowKey={(row) => row.kid}
        emptyTitle={`No ${meta.label.toLowerCase()} yet`}
        emptyDescription={meta.purpose}
        emptyState={
          <PlaceholderState
            variant="no-data"
            title={`No ${meta.label.toLowerCase()} yet`}
            description={`${actionLabel} to get started.`}
            className="py-14"
          />
        }
        maxBodyHeight="none"
        rowAction={(row) =>
          row.type === "RSA_PUBCERT" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
              onClick={generate}
              className="shadow-none"
            >
              Download
            </Button>
          ) : row.status === "ACTIVE" ? (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconButton
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`Revoke ${row.kid}`}
                    onClick={() => setRevoking(row)}
                    className="text-red-600 shadow-none hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10"
                  >
                    <Icon name="ban" size={15} />
                  </IconButton>
                </TooltipTrigger>
                <TooltipContent>Revoke key</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null
        }
      />

      <RevokeKeyDialog
        row={revoking}
        onOpenChange={(open) => !open && setRevoking(null)}
        onConfirm={confirmRevoke}
      />
      <GeneratedKeyDialog generated={generated} onClose={() => setGenerated(null)} />
    </div>
  );
}
