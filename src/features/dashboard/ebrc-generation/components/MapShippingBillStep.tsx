"use client";

import { useState } from "react";
import {
  Button,
  EmptyState,
  Field,
  FieldLabel,
  Input,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { CURRENCY_OPTIONS, MOCK_IRM_ROWS } from "@/features/dashboard/ebrc-generation/mock-data";
import {
  DEDUCTION_TYPE_LABELS,
  isMappingComplete,
  isMappingStarted,
  type DeductionType,
  type IrmMapping,
} from "@/features/dashboard/ebrc-generation/types";

const DEDUCTION_TYPES = Object.keys(DEDUCTION_TYPE_LABELS) as DeductionType[];

/** The left navigator's own row — enough to identify the IRM (amount,
 *  remitter, date) plus its completion state, matching the merchant-facing
 *  "work through these one by one" pattern. Status is derived straight from
 *  `mapping` (via `isMappingComplete`/`isMappingStarted`, shared with Step
 *  3's review) rather than a new status field, since nothing here changes
 *  what "complete" means. */
function IrmNavItem({
  irmId,
  mapping,
  active,
  onSelect,
}: {
  irmId: string;
  mapping: IrmMapping | undefined;
  active: boolean;
  onSelect: () => void;
}) {
  const irm = MOCK_IRM_ROWS.find((row) => row.id === irmId);
  const complete = isMappingComplete(mapping);
  const started = !complete && isMappingStarted(mapping);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active}
      className={cn(
        "flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2.5 text-left transition-colors",
        active ? "bg-primary/5" : "hover:bg-muted/50"
      )}
    >
      <span
        className={cn(
          "text-[13px] font-semibold tabular-nums",
          active ? "text-foreground" : "text-foreground/90"
        )}
      >
        {irm ? formatCurrency(irm.remittanceAmount, irm.currencyCode) : irmId}
      </span>
      {irm && (
        <span className="truncate text-[11.5px] text-muted-foreground">
          {irm.remitterName} · {irm.country}
        </span>
      )}
      <span
        className={cn(
          "mt-0.5 flex items-center gap-1 text-[11px] font-medium",
          complete
            ? "text-emerald-600 dark:text-emerald-400"
            : started
              ? "text-primary"
              : "text-amber-600 dark:text-amber-400"
        )}
      >
        <Icon
          name={complete ? "check" : started ? "clock" : "alert-circle"}
          className="h-3 w-3"
        />
        {complete ? "Complete" : started ? "In progress" : "Needs details"}
      </span>
    </button>
  );
}

/** One IRM's own upload-or-manual mapping form, plus its optional
 *  deduction — the same fields/handlers MappingCard always had, just
 *  without its own outer card chrome now that it renders inside the
 *  right-panel workspace instead of stacked with every other IRM's form. */
function MappingForm({
  irmId,
  mapping,
  onChange,
}: {
  irmId: string;
  mapping: IrmMapping;
  onChange: (next: IrmMapping) => void;
}) {
  const [deductionOpen, setDeductionOpen] = useState(!!mapping.deduction);

  const patch = (fields: Partial<IrmMapping>) => onChange({ ...mapping, ...fields });

  return (
    <div>
      <Tabs value={mapping.method} onValueChange={(v) => patch({ method: v as IrmMapping["method"] })}>
        <TabsList className="h-auto p-1">
          <TabsTrigger value="upload" className="gap-1.5 px-3 py-1.5">
            <Icon name="upload" className="h-3.5 w-3.5" />
            Upload document
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-1.5 px-3 py-1.5">
            <Icon name="pencil" className="h-3.5 w-3.5" />
            Enter manually
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-3">
          <label
            htmlFor={`shipping-bill-file-${irmId}`}
            className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center"
          >
            <Icon name="file-text" className="h-5 w-5 text-muted-foreground" />
            <span className="text-[13px] font-medium text-foreground">
              {mapping.fileName ?? "Click or drag a file to this area"}
            </span>
            <span className="text-[11.5px] text-muted-foreground">
              Accepted: PDF under 10MB (Max: 5)
            </span>
            <input
              id={`shipping-bill-file-${irmId}`}
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={(e) => patch({ fileName: e.target.files?.[0]?.name ?? null })}
            />
          </label>
        </TabsContent>

        <TabsContent value="manual" className="mt-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`sb-number-${irmId}`}>Shipping bill number</FieldLabel>
              <Input
                id={`sb-number-${irmId}`}
                value={mapping.shippingBillNumber}
                onChange={(e) => patch({ shippingBillNumber: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`sb-currency-${irmId}`}>Currency</FieldLabel>
              <Select
                value={mapping.shippingBillCurrency}
                onValueChange={(v) => patch({ shippingBillCurrency: v })}
              >
                <SelectTrigger id={`sb-currency-${irmId}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor={`port-code-${irmId}`}>Port code</FieldLabel>
              <Input
                id={`port-code-${irmId}`}
                value={mapping.portCode}
                onChange={(e) => patch({ portCode: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`bill-invoice-${irmId}`}>Bill/invoice number</FieldLabel>
              <Input
                id={`bill-invoice-${irmId}`}
                value={mapping.billInvoiceNumber}
                onChange={(e) => patch({ billInvoiceNumber: e.target.value })}
              />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor={`irm-amount-${irmId}`}>IRM amount to be mapped</FieldLabel>
              <Input
                id={`irm-amount-${irmId}`}
                inputMode="decimal"
                value={mapping.irmAmountToMap}
                onChange={(e) => patch({ irmAmountToMap: e.target.value })}
              />
            </Field>
          </div>
        </TabsContent>
      </Tabs>

      {deductionOpen ? (
        <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[12.5px] font-semibold text-foreground">
              Configure deduction (optional)
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto min-h-0 p-0 text-[12px] text-muted-foreground"
              onClick={() => {
                setDeductionOpen(false);
                patch({ deduction: null });
              }}
            >
              Remove
            </Button>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor={`deduction-type-${irmId}`}>Type</FieldLabel>
              <Select
                value={mapping.deduction?.type ?? "COMMISSION"}
                onValueChange={(v) =>
                  patch({
                    deduction: {
                      type: v as DeductionType,
                      amount: mapping.deduction?.amount ?? "",
                      additionalInfo: mapping.deduction?.additionalInfo ?? "",
                    },
                  })
                }
              >
                <SelectTrigger id={`deduction-type-${irmId}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEDUCTION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {DEDUCTION_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor={`deduction-amount-${irmId}`}>Deduction amount</FieldLabel>
              <Input
                id={`deduction-amount-${irmId}`}
                inputMode="decimal"
                placeholder="Enter amount"
                value={mapping.deduction?.amount ?? ""}
                onChange={(e) =>
                  patch({
                    deduction: {
                      type: mapping.deduction?.type ?? "COMMISSION",
                      amount: e.target.value,
                      additionalInfo: mapping.deduction?.additionalInfo ?? "",
                    },
                  })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`deduction-info-${irmId}`}>Additional info</FieldLabel>
              <Input
                id={`deduction-info-${irmId}`}
                placeholder="Optional"
                value={mapping.deduction?.additionalInfo ?? ""}
                onChange={(e) =>
                  patch({
                    deduction: {
                      type: mapping.deduction?.type ?? "COMMISSION",
                      amount: mapping.deduction?.amount ?? "",
                      additionalInfo: e.target.value,
                    },
                  })
                }
              />
            </Field>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="mt-3 h-auto min-h-0 p-0 text-[12.5px]"
          leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
          onClick={() => setDeductionOpen(true)}
        >
          Add configure deduction (optional)
        </Button>
      )}
    </div>
  );
}

interface MapShippingBillStepProps {
  selectedIds: string[];
  mappings: Record<string, IrmMapping>;
  onMappingChange: (irmId: string, next: IrmMapping) => void;
  /** Advances to Step 3 — called instead of moving to the next IRM once the
   *  merchant is on the last one in the list ("Save & review"). Same
   *  `goToStep(3)` the old shared footer called. */
  onProceed: () => void;
  /** Sends the merchant back to Step 1 from the empty state. */
  onBackToSelectIrms: () => void;
}

/** Step 2 — "Map Shipping Bill & Deduction", as a master-detail workspace: a
 *  scrollable left navigator over every selected IRM, and a single
 *  documentation form for whichever one is active on the right. Replaces
 *  the previous one-card-per-IRM vertical stack, which forced scrolling
 *  through every IRM's form to reach the next action.
 *
 *  All state (mappings, method, deduction) still lives in the parent's
 *  `mappings` record exactly as before — this only changes how much of it
 *  is on screen at once. Since every field already writes straight into
 *  that shared state on each keystroke, there is no separate "unsaved
 *  draft" to lose when switching IRMs — switching is always safe. */
export function MapShippingBillStep({
  selectedIds,
  mappings,
  onMappingChange,
  onProceed,
  onBackToSelectIrms,
}: MapShippingBillStepProps) {
  const [explicitActiveId, setExplicitActiveId] = useState<string | null>(null);
  const activeId =
    explicitActiveId && selectedIds.includes(explicitActiveId)
      ? explicitActiveId
      : (selectedIds[0] ?? null);

  const completedCount = selectedIds.filter((id) => isMappingComplete(mappings[id])).length;
  const progressPct = selectedIds.length > 0 ? (completedCount / selectedIds.length) * 100 : 0;

  if (selectedIds.length === 0) {
    return (
      <EmptyState
        title="No IRMs selected"
        description="Select IRMs to start mapping their shipping documentation."
        action={
          <Button type="button" variant="primary" size="sm" onClick={onBackToSelectIrms}>
            Back to Select IRMs
          </Button>
        }
        className="rounded-xl border border-border py-16"
      />
    );
  }

  const activeIrm = activeId ? MOCK_IRM_ROWS.find((row) => row.id === activeId) : undefined;
  const activeMapping = activeId ? mappings[activeId] : undefined;
  const activeIndex = activeId ? selectedIds.indexOf(activeId) : -1;
  const isLastByPosition = activeIndex === selectedIds.length - 1;

  const handleSaveAndNext = () => {
    if (isLastByPosition) {
      onProceed();
      return;
    }
    // Prefer the next IRM that still needs work; if everything ahead is
    // already complete, just move on to the next one in order.
    const next =
      selectedIds.slice(activeIndex + 1).find((id) => !isMappingComplete(mappings[id])) ??
      selectedIds[activeIndex + 1];
    setExplicitActiveId(next ?? null);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between text-[13px]">
          <span className="font-medium text-foreground">
            {completedCount} of {selectedIds.length} IRMs mapped
          </span>
        </div>
        <Progress value={progressPct} size="sm" className="mt-2" aria-label="Mapping progress" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[32%_1fr]">
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card lg:h-105">
          <div className="shrink-0 border-b border-border px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Selected IRMs
            </p>
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
            {selectedIds.map((id) => (
              <IrmNavItem
                key={id}
                irmId={id}
                mapping={mappings[id]}
                active={id === activeId}
                onSelect={() => setExplicitActiveId(id)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card lg:h-105">
          {activeIrm && activeMapping && activeId && (
            <>
              <div className="shrink-0 border-b border-border px-4 py-3">
                <p className="text-[14px] font-semibold tabular-nums text-foreground">
                  {formatCurrency(activeIrm.remittanceAmount, activeIrm.currencyCode)} ·{" "}
                  {formatDate(activeIrm.irmDate, { day: "2-digit", month: "short", year: "2-digit" })}
                </p>
                <p className="text-[12px] text-muted-foreground">Shipping documentation</p>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <MappingForm
                  irmId={activeId}
                  mapping={activeMapping}
                  onChange={(next) => onMappingChange(activeId, next)}
                />
              </div>

              <div className="flex shrink-0 items-center justify-end border-t border-border bg-card px-4 py-3">
                <Button
                  type="button"
                  variant="primary"
                  rightIcon={<Icon name="arrow-right" className="h-3.5 w-3.5" />}
                  onClick={handleSaveAndNext}
                >
                  {isLastByPosition ? "Save & review" : "Save & next"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
