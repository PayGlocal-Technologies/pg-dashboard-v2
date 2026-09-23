"use client";

import { Card, CardContent, Checkbox } from "@/components/ui";
import { Icon } from "@/components/icon";
import { formatCurrency } from "@/lib/utils/format";
import { MOCK_IRM_ROWS } from "@/features/dashboard/ebrc-generation/mock-data";
import { isMappingComplete, type IrmMapping } from "@/features/dashboard/ebrc-generation/types";

interface ReviewConfirmStepProps {
  selectedIds: string[];
  mappings: Record<string, IrmMapping>;
  agreed: boolean;
  onAgreedChange: (agreed: boolean) => void;
}

/** Step 3 — "Review eBRC Configuration" (Desktop/eBRC.pdf). */
export function ReviewConfirmStep({
  selectedIds,
  mappings,
  agreed,
  onAgreedChange,
}: ReviewConfirmStepProps) {
  const selectedRows = MOCK_IRM_ROWS.filter((row) => selectedIds.includes(row.id));
  const currency = selectedRows[0]?.currencyCode ?? "INR";
  const totalIrmAmount = selectedRows.reduce((sum, row) => sum + row.remittanceAmount, 0);
  const totalDeductions = selectedIds.reduce((sum, id) => {
    const amount = Number(mappings[id]?.deduction?.amount ?? 0);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  const finalAmount = Math.max(0, totalIrmAmount - totalDeductions);

  const fullyMappedCount = selectedIds.filter((id) => isMappingComplete(mappings[id])).length;
  const allMapped = selectedIds.length > 0 && fullyMappedCount === selectedIds.length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <div>
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Amount breakdown
          </h3>
          <Card size="sm" className="shadow-none">
            <CardContent className="divide-y divide-border p-0">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-[13px] text-foreground">Total IRM amount</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {selectedIds.length} IRM{selectedIds.length === 1 ? "" : "s"} selected
                  </p>
                </div>
                <p className="text-[13.5px] font-semibold tabular-nums text-foreground">
                  {formatCurrency(totalIrmAmount, currency)}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-[13px] text-foreground">Deductions &amp; charges</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Bank charges, fees, etc.
                  </p>
                </div>
                <p className="text-[13.5px] font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                  − {formatCurrency(totalDeductions, currency)}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 bg-primary/5 px-4 py-3">
                <div>
                  <p className="text-[13px] font-semibold text-foreground">Final eBRC amount</p>
                  <p className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                    Ready for generation
                  </p>
                </div>
                <p className="text-[15px] font-bold tabular-nums text-foreground">
                  {formatCurrency(finalAmount, currency)}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="mt-4 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-[12.5px] text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-200">
            <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              {allMapped
                ? "100% of your IRM amount has been mapped. All selected remittances will be included in this eBRC."
                : `${fullyMappedCount} of ${selectedIds.length} IRMs mapped so far. Go back to Map shipping bill to finish the rest.`}
            </p>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            IRM mapping details
          </h3>
          <Card size="sm" className="shadow-none">
            <CardContent className="space-y-2">
              {selectedRows.map((row) => {
                const mapped = isMappingComplete(mappings[row.id]);
                return (
                  <div
                    key={row.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={
                          mapped
                            ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                            : "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                        }
                      >
                        <Icon name={mapped ? "check" : "clock"} className="h-3 w-3" />
                      </span>
                      <div>
                        <p className="font-mono text-[12.5px] font-semibold text-foreground">
                          {row.irmNumber}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {mapped ? "Fully mapped" : "Not mapped yet"}
                        </p>
                      </div>
                    </div>
                    <p className="text-[13px] font-semibold tabular-nums text-foreground">
                      {formatCurrency(row.remittanceAmount, row.currencyCode)}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-2.5">
        <Checkbox
          checked={agreed}
          onCheckedChange={(next) => onAgreedChange(next === true)}
          className="mt-0.5"
        />
        <span className="text-[12.5px] text-muted-foreground">
          I have read and agree to the Terms &amp; Conditions and understand the steps required to
          complete this eBRC request.
        </span>
      </label>
    </div>
  );
}
