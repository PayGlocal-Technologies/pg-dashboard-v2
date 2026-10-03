"use client";

import { Card, DataTable, type Column } from "@/components/ui";
import { FeeInput } from "@/features/dashboard/partner-deals/components/FeeControls";
import {
  formatRate,
  marginFor,
  parseFee,
  type PricingProduct,
} from "@/features/dashboard/partner-pricing/pricing";

/** DataTable's own card and "Showing n of n" footer, dropped: the section's
 *  Card is the surface, as in Create Deal's pricing tables. */
const FLUSH_TABLE = "rounded-none border-0 bg-transparent [&>div+div]:hidden";

/** Your margin: "+0.2%" in the positive colour, "0%" with "No margin", or a
 *  quiet "—  Below PayGlocal rate" (amber text, never a red row). */
function MarginCell({ product, fee }: { product: PricingProduct; fee: string }) {
  const { state, margin } = marginFor(product, fee);
  if (state === "unset") {
    return <span className="text-[13px] text-muted-foreground">—</span>;
  }
  if (state === "below") {
    return (
      <span className="flex flex-col">
        <span className="text-[13px] text-muted-foreground">—</span>
        <span className="text-[11.5px] text-amber-700 dark:text-amber-400">
          Below PayGlocal rate
        </span>
      </span>
    );
  }
  if (state === "zero") {
    return (
      <span className="flex flex-col">
        <span className="text-[13px] font-semibold tabular-nums text-foreground">0%</span>
        <span className="text-[11.5px] text-muted-foreground">No margin</span>
      </span>
    );
  }
  return (
    <span className="text-[13px] font-semibold tabular-nums text-success">
      +{formatRate(margin!)}%
    </span>
  );
}

/** The editable merchant fee, with its own inline error. */
function FeeCell({
  id,
  product,
  value,
  onChange,
}: {
  /** Distinct per copy: the table and the phone rows are both mounted. */
  id: string;
  product: PricingProduct;
  value: string;
  onChange: (value: string) => void;
}) {
  const invalid = value.trim() !== "" && parseFee(value) === null;
  return (
    <div>
      <FeeInput
        id={id}
        value={value}
        onChange={onChange}
        feeType="PERCENTAGE"
        invalid={invalid}
        ariaLabel={`${product.name} merchant fee`}
        compact
        className="w-28"
      />
      {invalid && (
        <p className="mt-1 text-[11px] leading-tight text-destructive">
          Use a number up to 100, with up to 2 decimals.
        </p>
      )}
    </div>
  );
}

/**
 * One pricing category as a page section: its name and product count, a
 * line of what it covers, then Product → PayGlocal rate → Your merchant fee
 * (the one editable column) → Your margin. No money split here; that is the
 * Earnings Preview's job.
 */
export function PricingCategory({
  name,
  description,
  products,
  fees,
  onFeeChange,
}: {
  name: string;
  description: string;
  products: PricingProduct[];
  fees: Record<string, string>;
  onFeeChange: (productId: string, value: string) => void;
}) {
  const columns: Column<PricingProduct>[] = [
    {
      key: "product",
      header: "Product",
      minWidth: 220,
      render: (p) => (
        <span className="block">
          <span className="block text-[13px] font-medium text-foreground">{p.name}</span>
          <span className="block text-[11.5px] text-muted-foreground">{p.description}</span>
        </span>
      ),
    },
    {
      key: "payglocalRate",
      header: "PayGlocal rate",
      minWidth: 130,
      render: (p) => (
        <span className="text-[13px] tabular-nums text-muted-foreground">
          {formatRate(p.payglocalRate)}%
        </span>
      ),
    },
    {
      key: "merchantFee",
      header: "Your merchant fee",
      minWidth: 160,
      render: (p) => (
        <FeeCell
          id={`fee-${p.id}`}
          product={p}
          value={fees[p.id] ?? ""}
          onChange={(v) => onFeeChange(p.id, v)}
        />
      ),
    },
    {
      key: "margin",
      header: "Your margin",
      minWidth: 150,
      render: (p) => <MarginCell product={p} fee={fees[p.id] ?? ""} />,
    },
  ];

  return (
    <section aria-label={name} className="space-y-3">
      <div>
        <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          {name} <span className="font-normal">· {products.length}</span>
        </h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
      </div>
      <Card className="gap-0 overflow-hidden p-0 shadow-none">
        {/* md+: the table. Below md the four columns don't fit, and the two
            that matter most (fee, margin) were the ones cut off, so each
            product becomes a compact row with all four still visible. */}
        <div className="hidden md:block">
          <DataTable
            columns={columns}
            data={products}
            rowKey={(p) => p.id}
            density="compact"
            headerStyle="minimal"
            className={FLUSH_TABLE}
          />
        </div>
        <ul className="divide-y divide-border md:hidden">
          {products.map((p) => (
            <li key={p.id} className="space-y-2.5 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-foreground">{p.name}</span>
                  <span className="block text-[11.5px] text-muted-foreground">{p.description}</span>
                </span>
                <span className="shrink-0 text-right text-[11.5px] text-muted-foreground">
                  PayGlocal rate
                  <span className="block text-[13px] tabular-nums">
                    {formatRate(p.payglocalRate)}%
                  </span>
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <FeeCell
                  id={`fee-${p.id}-compact`}
                  product={p}
                  value={fees[p.id] ?? ""}
                  onChange={(v) => onFeeChange(p.id, v)}
                />
                <div className="text-right">
                  <MarginCell product={p} fee={fees[p.id] ?? ""} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
