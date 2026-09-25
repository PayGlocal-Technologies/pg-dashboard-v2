"use client";

import { Card, CardContent, Checkbox } from "@/components/ui";
import { Icon } from "@/components/icon";
import { formatCurrency } from "@/lib/utils/format";
import {
  calculateDeductions,
  toAmount,
  toIrmSelectionRow,
} from "@/features/dashboard/ebrc-generation/helpers";
import {
  isMappingComplete,
  type IrmDetails,
  type IrmMapping,
} from "@/features/dashboard/ebrc-generation/types";

interface ReviewConfirmStepProps {
  selectedIds: string[];
  mappings: Record<string, IrmMapping>;
  /** The server's own record per IRM. Totals are read from these, not from the
   *  form state, so the figures on this screen are the ones actually saved —
   *  and therefore the ones `push_irm` will submit. */
  records: Map<string, IrmDetails>;
  agreed: boolean;
  onAgreedChange: (agreed: boolean) => void;
}

/** Step 3 — "Review eBRC Configuration" (Desktop/eBRC.pdf).
 *
 *  Every figure here is read back off the saved records rather than the form
 *  state, so what the merchant confirms is exactly what `push_irm` submits. */
export function ReviewConfirmStep({
  selectedIds,
  mappings,
  records,
  agreed,
  onAgreedChange,
}: ReviewConfirmStepProps) {
  const selectedRecords = selectedIds
    .map((id) => records.get(id))
    .filter((record): record is IrmDetails => !!record);
  const selectedRows = selectedRecords.map(toIrmSelectionRow);

  /**
   * Only the IRMs that actually made it through mapping count toward the
   * figures, which is production's own `inProgressIrms` filter.
   *
   * `save_shipping_data` is what moves an IRM to IN_PROGRESS, so anything still
   * NOT_STARTED was selected but never saved — including it would quote the
   * merchant a total for an eBRC that will not contain it.
   */
  const inProgressRecords = selectedRecords.filter(
    (record) => record.irmProcessStatus === "IN_PROGRESS"
  );

  const currency = inProgressRecords[0]?.remittanceFCC ?? selectedRows[0]?.currencyCode ?? "INR";

  // Three distinct figures, each read the way production reads it: the
  // remittance value of the IRMs going in, how much of it was actually mapped
  // to shipping bills, and the deductions coming off that mapped amount.
  const totalIrmAmount = inProgressRecords.reduce(
    (sum, record) => sum + toAmount(record.remittanceFCCAmount),
    0
  );

  const totalMappedAmount = inProgressRecords.reduce(
    (sum, record) => sum + toAmount(record.shippingBillData?.mappedIRMAmountFCC),
    0
  );

  const totalDeductions = inProgressRecords.reduce(
    (sum, record) => sum + calculateDeductions(record.shippingBillData),
    0
  );

  // Off the mapped amount, not the remittance — an unmapped remainder never
  // reaches the certificate.
  const finalAmount = Math.max(0, totalMappedAmount - totalDeductions);

  // Share of the remittance value actually mapped to shipping bills, by
  // amount, exactly as production's ReviewSummaryCard computes it. Not a count
  // of saved IRMs: every IRM can be saved and still map less than its full
  // remittance (₹33,679.00 of ₹33,679.86, say), and the banner used to read
  // "100%" whenever each IRM merely had a saved shipping bill.
  const mappedPct = totalIrmAmount > 0 ? (totalMappedAmount / totalIrmAmount) * 100 : 0;
  const savedCount = selectedIds.filter((id) => isMappingComplete(records.get(id))).length;
  const allSaved = selectedIds.length > 0 && savedCount === selectedIds.length;

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
                    {inProgressRecords.length} of {selectedIds.length} IRM
                    {selectedIds.length === 1 ? "" : "s"} ready
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
                    From {formatCurrency(totalMappedAmount, currency)} mapped
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
        </div>

        <div>
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            IRM mapping details
          </h3>
          <Card size="sm" className="shadow-none">
            <CardContent className="space-y-2">
              {selectedRows.map((row) => {
                // Named by amount: "Fully mapped" only when the mapped amount
                // covers the whole remittance. A saved mapping for less is
                // partial, and says how much.
                const record = records.get(row.id);
                const saved = isMappingComplete(record);
                const mappedAmount = toAmount(record?.shippingBillData?.mappedIRMAmountFCC);
                const coverage = !saved
                  ? "none"
                  : mappedAmount + 0.005 >= row.remittanceAmount
                    ? "full"
                    : "partial";
                return (
                  <div
                    key={row.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={
                          coverage === "full"
                            ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                            : coverage === "partial"
                              ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                              : "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                        }
                      >
                        <Icon
                          name={
                            coverage === "full"
                              ? "check"
                              : coverage === "partial"
                                ? "pie-chart"
                                : "clock"
                          }
                          className="h-3 w-3"
                        />
                      </span>
                      <div>
                        <p className="font-mono text-[12.5px] font-semibold text-foreground">
                          {row.irmNumber}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {coverage === "full"
                            ? "Fully mapped"
                            : coverage === "partial"
                              ? `Partially mapped · ${formatCurrency(row.remittanceAmount, row.currencyCode)} on the IRM`
                              : "Not mapped yet"}
                        </p>
                      </div>
                    </div>
                    <p className="text-[13px] font-semibold tabular-nums text-foreground">
                      {formatCurrency(
                        toAmount(
                          records.get(row.id)?.shippingBillData?.mappedIRMAmountFCC ??
                            row.remittanceAmount
                        ),
                        row.currencyCode
                      )}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Under both columns, since it describes the whole request rather than
          the breakdown card it used to sit beneath, and only as wide as its
          own message (w-fit) rather than a bar across the page. */}
      <div className="flex w-fit max-w-full items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-[12.5px] text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-200">
        <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          {allSaved
            ? `${mappedPct.toFixed(2)}% of your IRM amount has been mapped. All selected remittances will be included in this eBRC.`
            : `${savedCount} of ${selectedIds.length} IRMs mapped so far. Go back to Map shipping bills to finish the rest.`}
        </p>
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
