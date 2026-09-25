"use client";

import { useEffect, useRef, useState } from "react";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import {
  Badge,
  Button,
  Card,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  EmptyState,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  IconButton,
  Input,
  Progress,
  Shimmer,
  Switch,
} from "@/components/ui";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { AppImage } from "@/components/common/AppImage";
import { EbrcStepFooterBar } from "@/features/dashboard/ebrc-generation/components/EbrcStepFooterBar";
import {
  DEDUCTION_FIELDS,
  EXTRACTION_STATUS_DONE,
  isDeductionPopulated,
  isMappingComplete,
  isMappingStarted,
  validateMapping,
  type MappingFieldErrors,
  totalDeductions,
  type DeductionsByType,
  type DeductionType,
  type IrmDetails,
  type IrmMapping,
} from "@/features/dashboard/ebrc-generation/types";
import {
  toAmount,
  toIrmSelectionRow,
  toShippingBillData,
} from "@/features/dashboard/ebrc-generation/helpers";
import {
  MAX_SHIPPING_BILL_MB,
  useExtractionStatus,
  useSaveShippingData,
  useShippingBillUpload,
} from "@/features/dashboard/ebrc-generation/hooks";

/** The left navigator's own row — enough to identify the IRM (amount,
 *  remitter, date) plus its completion state, matching the merchant-facing
 *  "work through these one by one" pattern. Status is derived straight from
 *  `mapping` (via `isMappingComplete`/`isMappingStarted`, shared with Step
 *  3's review) rather than a new status field, since nothing here changes
 *  what "complete" means. */
function IrmNavItem({
  irmId,
  record,
  mapping,
  active,
  onSelect,
}: {
  irmId: string;
  record: IrmDetails | undefined;
  mapping: IrmMapping | undefined;
  active: boolean;
  onSelect: () => void;
}) {
  const irm = record ? toIrmSelectionRow(record) : undefined;
  const complete = isMappingComplete(record);
  const started = !complete && isMappingStarted(mapping);

  return (
    // A bare `<button>`, not flux's `<Button>`: that component wraps its
    // children in a single inner span laid out as a row, which collapses this
    // row's stacked amount/remitter/status lines onto one line. Same reason
    // the invoice preview's own clickable sections take (see parts.tsx).
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
        <Icon name={complete ? "check" : started ? "clock" : "alert-circle"} className="h-3 w-3" />
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
  record,
  previewUrl,
  onChange,
  onUploaded,
  onExtracting,
  errors,
}: {
  irmId: string;
  mapping: IrmMapping;
  record: IrmDetails | undefined;
  /** Presigned GET for a PDF already uploaded and extracted, if any. */
  previewUrl: string | undefined;
  onChange: (next: IrmMapping) => void;
  onUploaded: () => void;
  /** Flags this IRM as extracting the moment its upload starts, before the
   *  server has flipped the record to STARTED. */
  onExtracting: (extracting: boolean) => void;
  /** Populated only once the merchant has tried to save — production surfaces
   *  its field errors on submit, not while typing. */
  errors: MappingFieldErrors;
}) {
  const [deductionsDrawerOpen, setDeductionsDrawerOpen] = useState(false);
  // Heads the merchant switched on but has not typed into yet. Production
  // keeps the same override map: without it, turning a switch on would snap
  // straight back off, since "enabled" is otherwise derived from having a
  // value.
  const [enabledOverrides, setEnabledOverrides] = useState<Partial<Record<DeductionType, boolean>>>(
    {}
  );
  const [isUploading, setIsUploading] = useState(false);

  const { upload } = useShippingBillUpload();
  const currency = mapping.shippingBillCurrency || (record?.remittanceFCC ?? "");
  const extracting = record?.shippingBillExtractionStatus === "STARTED" || isUploading;

  const patch = (fields: Partial<IrmMapping>) => onChange({ ...mapping, ...fields });

  const patchDeduction = (type: DeductionType, fields: Partial<DeductionsByType[DeductionType]>) =>
    patch({
      deductions: {
        ...mapping.deductions,
        [type]: { ...mapping.deductions[type], ...fields },
      },
    });

  /** Production's `isDeductionEnabled`: on when it holds a value, or when the
   *  merchant just switched it on. */
  const isDeductionEnabled = (type: DeductionType) =>
    enabledOverrides[type] === true ||
    (enabledOverrides[type] !== false && isDeductionPopulated(mapping.deductions[type]));

  /** Switching a head off clears both of its fields, so it drops out of the
   *  next save — production does the same on toggle. */
  const toggleDeduction = (type: DeductionType, checked: boolean) => {
    setEnabledOverrides((prev) => ({ ...prev, [type]: checked }));
    if (!checked) patchDeduction(type, { amount: "", additionalInfo: "" });
  };

  /** "Delete All Deductions" — every head cleared and every override reset. */
  const clearAllDeductions = () => {
    const cleared = { ...mapping.deductions };
    for (const { type } of DEDUCTION_FIELDS) cleared[type] = { amount: "", additionalInfo: "" };
    patch({ deductions: cleared });
    setEnabledOverrides({});
  };

  const populatedDeductions = DEDUCTION_FIELDS.filter(({ type }) =>
    isDeductionPopulated(mapping.deductions[type])
  );

  return (
    <div>
      {/* Upload first, form below — both always visible, as production has
          them. Uploading does not replace the form: the backend extracts the
          PDF and those values come back on the IRM record, prefilling these
          same fields for the merchant to check before saving. Hiding the form
          behind a tab meant the extracted values landed somewhere the merchant
          was not looking. */}
      <div>
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-semibold text-foreground">Upload shipping bill</p>
          <Badge variant="secondary" size="sm">
            Recommended
          </Badge>
        </div>
        <p className="text-[11.5px] text-muted-foreground">
          Invoice corresponding to the shipped goods. We&apos;ll read it and fill in the details
          below.
        </p>
        <div className="mt-2">
          <label
            htmlFor={`shipping-bill-file-${irmId}`}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center",
              extracting ? "cursor-wait opacity-70" : "cursor-pointer"
            )}
          >
            <Icon
              name={extracting ? "loader" : "file-text"}
              className={cn("h-5 w-5 text-muted-foreground", extracting && "animate-spin")}
            />
            <span className="text-[13px] font-medium text-foreground">
              {extracting
                ? "Reading the document…"
                : (mapping.fileName ?? "Click or drag a file to this area")}
            </span>
            <span className="text-[11.5px] text-muted-foreground">
              Accepted: PDF under {MAX_SHIPPING_BILL_MB}MB
            </span>
            {/* Bare `<input type="file">`, visually hidden and driven by the
                label above it — flux has no file-picker component, and this is
                the same exemption InvoiceDropzone, SkuMediaUpload and
                ImportSkuFileModal already take. */}
            <input
              id={`shipping-bill-file-${irmId}`}
              type="file"
              accept="application/pdf"
              className="sr-only"
              disabled={extracting}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                // Optimistic only in the name — the fields it fills in come
                // from the backend's own extraction, never guessed here.
                patch({ fileName: file.name });
                setIsUploading(true);
                upload(irmId, file, () => {
                  setIsUploading(false);
                  onUploaded();
                });
              }}
            />
          </label>

          {/* The extracted document itself, once the backend has read it —
              the presigned GET only exists after extraction COMPLETED. */}
          {previewUrl && !extracting && (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="mt-2 h-auto min-h-0 p-0 text-[12.5px]"
              rightIcon={<Icon name="arrow-up-right" className="h-3 w-3" />}
              onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}
            >
              View uploaded shipping bill
            </Button>
          )}

          {record?.shippingBillExtractionStatus === "FAILED" && (
            <p className="mt-2 text-[12px] text-destructive">
              We couldn&apos;t read that document. Enter the details manually instead.
            </p>
          )}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[13px] font-semibold text-foreground">Shipping bill details</p>
        <p className="text-[11.5px] text-muted-foreground">
          Check these against the document before saving.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`sb-number-${irmId}`}>
              Shipping bill number
              <span aria-hidden className="text-destructive">
                {" "}
                *
              </span>
            </FieldLabel>
            <Input
              id={`sb-number-${irmId}`}
              value={mapping.shippingBillNumber}
              onChange={(e) => patch({ shippingBillNumber: e.target.value })}
              aria-invalid={!!errors.shippingBillNumber || undefined}
            />
            {errors.shippingBillNumber && <FieldError>{errors.shippingBillNumber}</FieldError>}
          </Field>

          <Field>
            <FieldLabel htmlFor={`sb-currency-${irmId}`}>Currency</FieldLabel>
            {/* Read-only, and taken from the IRM: the shipping bill is being
                mapped against that remittance, so its currency is not the
                merchant's to pick. Production renders this field disabled. */}
            <Input
              id={`sb-currency-${irmId}`}
              value={mapping.shippingBillCurrency || (record?.remittanceFCC ?? "")}
              readOnly
              disabled
            />
          </Field>

          <Field>
            <FieldLabel htmlFor={`sb-value-${irmId}`}>
              Shipping bill value
              <span aria-hidden className="text-destructive">
                {" "}
                *
              </span>
            </FieldLabel>
            <Input
              id={`sb-value-${irmId}`}
              inputMode="decimal"
              value={mapping.shippingBillValue}
              onChange={(e) => patch({ shippingBillValue: e.target.value })}
              aria-invalid={!!errors.shippingBillValue || undefined}
            />
            {errors.shippingBillValue && <FieldError>{errors.shippingBillValue}</FieldError>}
          </Field>

          <Field>
            <FieldLabel htmlFor={`sb-date-${irmId}`}>
              Shipping bill date
              <span aria-hidden className="text-destructive">
                {" "}
                *
              </span>
            </FieldLabel>
            <Input
              id={`sb-date-${irmId}`}
              type="date"
              value={mapping.shippingBillDate}
              onChange={(e) => patch({ shippingBillDate: e.target.value })}
              aria-invalid={!!errors.shippingBillDate || undefined}
            />
            {errors.shippingBillDate && <FieldError>{errors.shippingBillDate}</FieldError>}
          </Field>

          <Field>
            <FieldLabel htmlFor={`port-code-${irmId}`}>
              Port code
              <span aria-hidden className="text-destructive">
                {" "}
                *
              </span>
            </FieldLabel>
            <Input
              id={`port-code-${irmId}`}
              value={mapping.portCode}
              onChange={(e) => patch({ portCode: e.target.value })}
              aria-invalid={!!errors.portCode || undefined}
            />
            {errors.portCode && <FieldError>{errors.portCode}</FieldError>}
          </Field>

          <Field>
            <FieldLabel htmlFor={`bill-invoice-${irmId}`}>
              Bill/invoice number
              <span aria-hidden className="text-destructive">
                {" "}
                *
              </span>
            </FieldLabel>
            <Input
              id={`bill-invoice-${irmId}`}
              value={mapping.billInvoiceNumber}
              onChange={(e) => patch({ billInvoiceNumber: e.target.value })}
              aria-invalid={!!errors.billInvoiceNumber || undefined}
            />
            {errors.billInvoiceNumber && <FieldError>{errors.billInvoiceNumber}</FieldError>}
          </Field>

          <Field className="sm:col-span-2">
            <FieldLabel htmlFor={`irm-amount-${irmId}`}>
              IRM amount to be mapped
              <span aria-hidden className="text-destructive">
                {" "}
                *
              </span>
            </FieldLabel>
            <Input
              id={`irm-amount-${irmId}`}
              inputMode="decimal"
              value={mapping.irmAmountToMap}
              onChange={(e) => patch({ irmAmountToMap: e.target.value })}
              aria-invalid={!!errors.irmAmountToMap || undefined}
            />
            {errors.irmAmountToMap ? (
              <FieldError>{errors.irmAmountToMap}</FieldError>
            ) : (
              record?.remittanceFCCAmount != null && (
                <FieldDescription>
                  Up to {formatCurrency(toAmount(record.remittanceFCCAmount), currency)} available
                  on this IRM.
                </FieldDescription>
              )
            )}
          </Field>
        </div>
      </div>

      {/* Deductions, modelled on production's own EbrcDeductions: a summary of
          whatever is populated, with Edit and Delete-all beside it, and the
          five heads themselves behind a drawer — each with its own switch, and
          its fields hidden until that switch is on. */}
      {populatedDeductions.length > 0 ? (
        <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[12.5px] font-semibold text-foreground">
                Configure Deduction (optional)
              </p>
              <p className="text-[11.5px] text-muted-foreground">
                Amount will be deducted from the IRM value
              </p>
            </div>
            <div className="flex items-center gap-1">
              <IconButton
                aria-label="Edit deductions"
                variant="ghost"
                size="sm"
                onClick={() => setDeductionsDrawerOpen(true)}
              >
                <Icon name="pencil" className="h-3.5 w-3.5 text-primary" />
              </IconButton>
              <IconButton
                aria-label="Delete all deductions"
                variant="ghost"
                size="sm"
                onClick={clearAllDeductions}
              >
                <Icon name="trash-2" className="h-3.5 w-3.5 text-destructive" />
              </IconButton>
            </div>
          </div>

          {/* Only the heads that actually carry a value, exactly as production
              lists them — a switched-off head is not shown as an empty row. */}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {populatedDeductions.map(({ type, heading }) => {
              const entry = mapping.deductions[type];
              return (
                <div key={type}>
                  <p className="text-[12px] font-semibold text-foreground">{heading}</p>
                  {entry?.amount && (
                    <p className="text-[11.5px] text-muted-foreground">
                      Deduction Amount: {entry.amount}
                    </p>
                  )}
                  {entry?.additionalInfo && (
                    <p className="text-[11.5px] text-muted-foreground">
                      Additional info value: {entry.additionalInfo}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3 w-fit"
          leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
          onClick={() => setDeductionsDrawerOpen(true)}
        >
          Configure Deductions (Optional)
        </Button>
      )}

      <Drawer open={deductionsDrawerOpen} onOpenChange={setDeductionsDrawerOpen}>
        <DrawerContent className="w-full sm:w-xl sm:max-w-[92vw]">
          <DrawerHeader>
            <DrawerTitle className="text-[15px]">Configure Deductions (Optional)</DrawerTitle>
          </DrawerHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-6">
            {DEDUCTION_FIELDS.map(({ type, heading, subHeading }) => {
              const enabled = isDeductionEnabled(type);
              return (
                <Card key={type} className="gap-0 bg-muted/30 p-0">
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">{heading}</p>
                      <p className="text-[11.5px] text-muted-foreground">{subHeading}</p>
                    </div>
                    <Switch
                      checked={enabled}
                      aria-label={`Apply ${heading} deduction`}
                      onCheckedChange={(checked) => toggleDeduction(type, checked)}
                    />
                  </div>

                  {/* Hidden, not disabled, while the switch is off — the same
                      `display: none` production's DeductionCard body uses. */}
                  {enabled && (
                    <div className="grid grid-cols-1 gap-3 border-t border-border p-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor={`deduction-amount-${type}-${irmId}`}>
                          Deduction Amount
                        </FieldLabel>
                        <Input
                          id={`deduction-amount-${type}-${irmId}`}
                          inputMode="decimal"
                          placeholder="Enter deduction amount"
                          value={mapping.deductions[type]?.amount ?? ""}
                          onChange={(e) => patchDeduction(type, { amount: e.target.value })}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor={`deduction-info-${type}-${irmId}`}>
                          Additional Info Value
                        </FieldLabel>
                        <Input
                          id={`deduction-info-${type}-${irmId}`}
                          placeholder="Enter additional info value"
                          value={mapping.deductions[type]?.additionalInfo ?? ""}
                          onChange={(e) => patchDeduction(type, { additionalInfo: e.target.value })}
                        />
                      </Field>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <div className="flex shrink-0 justify-end border-t border-border p-4">
            <Button type="button" variant="primary" onClick={() => setDeductionsDrawerOpen(false)}>
              Done
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

interface MapShippingBillStepProps {
  selectedIds: string[];
  mappings: Record<string, IrmMapping>;
  /** The server's own record per IRM — its saved shipping-bill data, its
   *  extraction status, and the fields the merchant never types (AD code,
   *  IFSC, currency) that the save payload needs. */
  records: Map<string, IrmDetails>;
  /** Presigned GETs for already-extracted PDFs, keyed by IRM number. */
  presignedUrls: Record<string, string>;
  /** `fetch_irm_by_number` is still in flight. */
  isLoading: boolean;
  /** It failed. Without this the panel just renders empty, which is
   *  indistinguishable from "this IRM has no details" and impossible to act on. */
  isError: boolean;
  onMappingChange: (irmId: string, next: IrmMapping) => void;
  /** Re-reads `fetch_irm_by_number`, after an upload or a save moves an IRM on.
   *  Resolves with the fresh records so the caller can gate on them. */
  onRefetchIrms: () => Promise<IrmDetails[] | undefined>;
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
 *  All state (mappings, method, deductions) lives in the parent's `mappings`
 *  record, so switching IRMs never loses a draft. "Save & next" is what
 *  persists it: it POSTs `save_shipping_data` for the active IRM and only
 *  moves on once the server has taken it, matching pg-dashboard — which also
 *  submits the server's copy, not the form's, at the end of the wizard. */
export function MapShippingBillStep({
  selectedIds,
  mappings,
  records,
  presignedUrls,
  isLoading,
  isError,
  onMappingChange,
  onRefetchIrms,
  onProceed,
  onBackToSelectIrms,
}: MapShippingBillStepProps) {
  const [explicitActiveId, setExplicitActiveId] = useState<string | null>(null);
  // Field errors per IRM, raised on a failed save attempt and cleared as soon
  // as that IRM is edited again — production's forms behave the same way:
  // validation surfaces on submit, not while typing.
  const [errorsByIrm, setErrorsByIrm] = useState<Record<string, MappingFieldErrors>>({});
  const { save, isSaving } = useSaveShippingData();
  const { fetchStatus } = useExtractionStatus();

  /**
   * IRMs the backend is still reading a PDF for.
   *
   * Two sources, both of which production polls (see `pollingIrmNumbers` in
   * its ShippingBillMapping): the server saying STARTED, and this session
   * having just uploaded one. The second matters — `extract_shipping_data`
   * returns before the record flips to STARTED, so polling only on the server's
   * word means the first few seconds after an upload are silent, and if the
   * flip is missed entirely the poll never starts at all.
   *
   * `skipPoll` retires an IRM once its extraction has resolved, so a completed
   * one is not re-polled every tick; it is cleared again if the server later
   * reports STARTED, which is what a re-upload looks like.
   */
  const [isExtracting, setIsExtracting] = useState<Record<string, boolean>>({});
  const [resolved, setResolved] = useState<Record<string, boolean>>({});

  const pollingIds = selectedIds.filter((id) => {
    // Retired once its extraction has answered, so a record the server leaves
    // on STARTED cannot be polled forever. Starting a new upload clears this
    // again, which is what lets a re-upload re-enter the poll.
    if (resolved[id]) return false;
    return records.get(id)?.shippingBillExtractionStatus === "STARTED" || isExtracting[id];
  });
  const pollingKey = pollingIds.join(",");

  // The refetch callback is kept in a ref so the poll interval isn't torn down
  // and rebuilt every time the parent re-renders — only a change in *which*
  // IRMs are extracting should restart it. Written in an effect, never during
  // render.
  const refetchRef = useRef(onRefetchIrms);
  useEffect(() => {
    refetchRef.current = onRefetchIrms;
  }, [onRefetchIrms]);

  useEffect(() => {
    if (!pollingKey) return;
    let cancelled = false;

    const id = setInterval(() => {
      void (async () => {
        for (const irmNumber of pollingKey.split(",")) {
          if (cancelled) return;
          try {
            const status = await fetchStatus(irmNumber);
            if (cancelled) return;
            if (status && EXTRACTION_STATUS_DONE.has(status)) {
              // Retire it before refetching, so the next tick does not poll an
              // IRM whose answer is already in.
              setResolved((prev) => (prev[irmNumber] ? prev : { ...prev, [irmNumber]: true }));
              setIsExtracting((prev) =>
                prev[irmNumber] === false ? prev : { ...prev, [irmNumber]: false }
              );
              refetchRef.current();
            }
          } catch {
            // Non-fatal: the next tick retries.
          }
        }
      })();
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pollingKey, fetchStatus]);
  const activeId =
    explicitActiveId && selectedIds.includes(explicitActiveId)
      ? explicitActiveId
      : (selectedIds[0] ?? null);

  const completedCount = selectedIds.filter((id) => isMappingComplete(records.get(id))).length;
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

  const activeRecord = activeId ? records.get(activeId) : undefined;
  const activeExtracting =
    !!activeId &&
    (activeRecord?.shippingBillExtractionStatus === "STARTED" || !!isExtracting[activeId]);
  const activeIrm = activeRecord ? toIrmSelectionRow(activeRecord) : undefined;
  const activeMapping = activeId ? mappings[activeId] : undefined;
  const activeIndex = activeId ? selectedIds.indexOf(activeId) : -1;
  const isLastByPosition = activeIndex === selectedIds.length - 1;

  const handleSaveAndNext = () => {
    if (!activeId || !activeMapping || !activeRecord) return;

    // Validate before saving, exactly where production does it: its
    // `handleNext` awaits `form.validateFields()` and returns without calling
    // `save_shipping_data` if anything fails. That ordering is what keeps an
    // IRM's status honest — NOT_STARTED until a complete mapping is accepted.
    const fieldErrors = validateMapping(activeMapping, toAmount(activeRecord.remittanceFCCAmount));
    if (Object.keys(fieldErrors).length > 0) {
      setErrorsByIrm((prev) => ({ ...prev, [activeId]: fieldErrors }));
      if (fieldErrors.deductions) toast.error(fieldErrors.deductions);
      return;
    }
    setErrorsByIrm((prev) => (prev[activeId] ? { ...prev, [activeId]: {} } : prev));

    save(toShippingBillData(activeMapping, activeRecord), async () => {
      const fresh = await onRefetchIrms();

      if (isLastByPosition) {
        // Production's own gate: after the last save it re-reads every record
        // and only moves on once all of them report IN_PROGRESS. Anything still
        // NOT_STARTED never had its shipping bill accepted, and reaching Review
        // with those in the selection means confirming an eBRC that silently
        // excludes them.
        const pending = (fresh ?? [])
          .filter((record) => record.irmProcessStatus !== "IN_PROGRESS")
          .map((record) => record.irmNumber)
          .filter(Boolean);

        if (fresh && fresh.length > 0 && pending.length > 0) {
          toast.error(
            `Please map and validate the following IRMs before proceeding: ${pending.join(", ")}`
          );
          return;
        }

        onProceed();
        return;
      }
      // Prefer the next IRM that still needs work; if everything ahead is
      // already complete, just move on to the next one in order.
      const next =
        selectedIds.slice(activeIndex + 1).find((id) => !isMappingComplete(records.get(id))) ??
        selectedIds[activeIndex + 1];
      setExplicitActiveId(next ?? null);
    });
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
                record={records.get(id)}
                mapping={mappings[id]}
                active={id === activeId}
                onSelect={() => setExplicitActiveId(id)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card lg:h-105">
          {/* The record behind the active IRM comes from `fetch_irm_by_number`,
              not from the selection — so this panel has three non-content
              states of its own, and every one of them used to render as a
              blank box. */}
          {isLoading ? (
            <div className="space-y-3 p-4">
              <Shimmer className="h-5 w-48" />
              <Shimmer className="h-9 w-full" />
              <Shimmer className="h-40 w-full" />
            </div>
          ) : isError ? (
            <PlaceholderState
              variant="error"
              size="sm"
              title="Couldn't load this IRM"
              description="The shipping-bill details for this IRM didn't load."
              action={
                <Button type="button" variant="outline" size="sm" onClick={onRefetchIrms}>
                  Try again
                </Button>
              }
              className="m-auto py-10"
            />
          ) : !activeRecord ? (
            <PlaceholderState
              variant="no-transactions"
              size="sm"
              title="No details for this IRM"
              description={
                activeId
                  ? `${activeId} came back without a record. It may have been mapped or withdrawn since you selected it.`
                  : "Select an IRM from the list to start mapping it."
              }
              action={
                <Button type="button" variant="outline" size="sm" onClick={onRefetchIrms}>
                  Refresh
                </Button>
              }
              className="m-auto py-10"
            />
          ) : (
            activeIrm &&
            activeMapping &&
            activeId && (
              <>
                <div className="shrink-0 border-b border-border px-4 py-3">
                  <p className="text-[14px] font-semibold tabular-nums text-foreground">
                    {formatCurrency(activeIrm.remittanceAmount, activeIrm.currencyCode)} ·{" "}
                    {formatDate(activeIrm.irmDate, {
                      day: "2-digit",
                      month: "short",
                      year: "2-digit",
                    })}
                  </p>
                  <p className="text-[12px] text-muted-foreground">Shipping documentation</p>
                </div>

                <div className="relative min-h-0 flex-1 overflow-y-auto p-4">
                  {/* Covers the whole form, not just the upload tab: while the
                      backend is reading the PDF it is about to overwrite these
                      fields, so letting them be typed into invites losing the
                      edit. Production spins the same region for the same
                      reason. */}
                  {activeExtracting && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-card/75 backdrop-blur-[1px]">
                      <Icon name="loader" className="h-5 w-5 animate-spin text-primary" />
                      <p className="text-[12.5px] font-medium text-foreground">
                        Reading the shipping bill…
                      </p>
                      <p className="text-[11.5px] text-muted-foreground">
                        The fields below fill in once it&apos;s done.
                      </p>
                    </div>
                  )}
                  <MappingForm
                    irmId={activeId}
                    mapping={activeMapping}
                    record={activeRecord}
                    previewUrl={presignedUrls[activeId]}
                    errors={errorsByIrm[activeId] ?? {}}
                    onChange={(next) => {
                      // Editing clears that field's complaint, so a corrected
                      // value stops looking wrong before the next save.
                      setErrorsByIrm((prev) =>
                        prev[activeId] ? { ...prev, [activeId]: {} } : prev
                      );
                      onMappingChange(activeId, next);
                    }}
                    onUploaded={onRefetchIrms}
                    onExtracting={(extracting) => {
                      setIsExtracting((prev) => ({ ...prev, [activeId]: extracting }));
                      // A fresh upload is a fresh extraction to wait on.
                      if (extracting) {
                        setResolved((prev) => {
                          if (!prev[activeId]) return prev;
                          const next = { ...prev };
                          delete next[activeId];
                          return next;
                        });
                      }
                    }}
                  />
                </div>
              </>
            )
          )}
        </div>
      </div>

      {/* Same fixed bar SelectIrmsStep docks its own actions in, so "the
          buttons" stay in one place as the merchant moves through the
          wizard rather than each step growing a differently-placed footer. */}
      <EbrcStepFooterBar
        left={
          <span className="text-[13px] text-muted-foreground">
            {completedCount} of {selectedIds.length} IRMs mapped
          </span>
        }
        right={
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto min-h-0 p-0 text-[12.5px] text-muted-foreground hover:bg-transparent hover:text-foreground"
              onClick={onBackToSelectIrms}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="primary"
              rightIcon={<Icon name="arrow-right" className="h-3.5 w-3.5" />}
              disabled={isSaving || !activeRecord}
              isLoading={isSaving}
              onClick={handleSaveAndNext}
            >
              {isLastByPosition ? "Save & review" : "Save & next"}
            </Button>
          </>
        }
      />
    </div>
  );
}
