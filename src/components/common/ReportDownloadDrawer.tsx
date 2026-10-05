"use client";

import { useState } from "react";
import {
  Button,
  Calendar,
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Field,
  FieldError,
  FieldLabel,
  IconButton,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import {
  EMPTY_RELATIVE_RANGE,
  hasRelativeRange,
  relativeRangeToEpochMs,
  toEndOfDayMs,
  toStartOfDayMs,
  type RelativeRangeValue,
} from "@/components/common/filters/FilterChips";
import {
  DATE_PRESETS,
  RELATIVE_PRESETS,
  formatDayLabel,
  formatRelativeSummary,
  fromYmd,
  getPresetRange,
  isWindowValid,
  matchPreset,
  sameRelative,
  startOfDay,
  toYmd,
  type ReportWindowMode,
} from "@/components/common/reportWindow";

export interface ReportWindow {
  /** Epoch millis. */
  startTime: number;
  endTime: number;
}

export interface ReportDownloadDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Defaults to "Generate report", production's drawer title. */
  title?: string;
  /** The page's own date filter, which the drawer opens pre-filled with —
   *  production's setReportRange does the same. Read once on mount, so
   *  remount the drawer (bump its `key`) each time it opens to re-seed it. */
  initialDateRange?: { from: string; to: string };
  initialRelativeRange?: RelativeRangeValue;
  /** Keep the drawer's button in its loading state; the caller closes the
   *  drawer itself once the download lands. */
  isGenerating: boolean;
  /** Called with the chosen window. The caller builds its own request body
   *  from it, since every report endpoint shapes that differently. */
  onGenerate: (window: ReportWindow) => void;
}

const EMPTY_DATE_RANGE = { from: "", to: "" };

const RELATIVE_FIELDS: { key: keyof RelativeRangeValue; label: string }[] = [
  { key: "weeks", label: "Weeks" },
  { key: "days", label: "Days" },
  { key: "hours", label: "Hours" },
  { key: "minutes", label: "Minutes" },
];

/** Outline chip for a quick-select preset; the active one takes the primary
 *  border, a primary tint and primary text. */
function chipClass(active: boolean): string {
  return cn(
    "w-full",
    active && "border-primary bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
  );
}

/**
 * Shared "Generate report" drawer for every report download that needs a
 * time window: v2's port of pg-dashboard's Common/ReportDownload drawer. The
 * merchant picks either an absolute date range (quick-select presets plus an
 * inline range calendar) or a relative "last N weeks/days/hours/minutes"
 * window, then Generate & Download hands the resolved window back through
 * `onGenerate`; the caller owns the endpoint, the request body and the file.
 *
 * The window is required, even though production's drawer lets an empty one
 * through: report routes now reject a body without one ("Report download
 * without time range is not allowed", GL-400-001), so an empty submit could
 * only ever fail.
 *
 * Every day is a local-time calendar day: the request runs from 00:00 on the
 * start day to 23:59:59.999 on the end day in the browser's timezone, via
 * toStartOfDayMs/toEndOfDayMs, as the transactions table's own date filter
 * does.
 */
export function ReportDownloadDrawer({
  open,
  onOpenChange,
  title = "Generate report",
  initialDateRange = EMPTY_DATE_RANGE,
  initialRelativeRange = EMPTY_RELATIVE_RANGE,
  isGenerating,
  onGenerate,
}: ReportDownloadDrawerProps) {
  // `today` is read once on mount (no Date during render, see CLAUDE.md);
  // the drawer is remounted on every open, so it never goes stale.
  const [today] = useState(() => startOfDay(new Date()));
  const [mode, setMode] = useState<ReportWindowMode>(
    hasRelativeRange(initialRelativeRange) ? "relative" : "dateRange"
  );
  const [start, setStart] = useState<Date | undefined>(() => fromYmd(initialDateRange.from));
  const [end, setEnd] = useState<Date | undefined>(() => fromYmd(initialDateRange.to));
  const [month, setMonth] = useState<Date>(
    () => fromYmd(initialDateRange.to) ?? fromYmd(initialDateRange.from) ?? today
  );
  const [relative, setRelative] = useState<RelativeRangeValue>(
    hasRelativeRange(initialRelativeRange) ? initialRelativeRange : EMPTY_RELATIVE_RANGE
  );
  // Set by a failed submit; any edit clears it, so the error only shows while
  // the window is still the one that failed.
  const [submitFailed, setSubmitFailed] = useState(false);

  const isRange = mode === "dateRange";
  const valid = isWindowValid(mode, { start, end, relative });
  const showError = submitFailed && !valid;
  const activePreset = matchPreset(start, end, today);

  const summary = !valid
    ? null
    : isRange
      ? `Report covers ${formatDayLabel(start!)}, 00:00 to ${formatDayLabel(end!)}, 23:59`
      : `Report covers the last ${formatRelativeSummary(relative)}, up to when you click Generate`;

  const pickPreset = (id: (typeof DATE_PRESETS)[number]["id"]) => {
    const range = getPresetRange(id, today);
    setStart(range.start);
    setEnd(range.end);
    setMonth(range.end);
    setSubmitFailed(false);
  };

  const submit = () => {
    if (isGenerating) return;
    if (!valid) {
      setSubmitFailed(true);
      return;
    }
    if (isRange) {
      onGenerate({
        startTime: toStartOfDayMs(toYmd(start!)),
        endTime: toEndOfDayMs(toYmd(end!)),
      });
      return;
    }
    // Resolved here, at click time: "last 2 days" means two days before now.
    const window = relativeRangeToEpochMs(relative);
    if (window) onGenerate(window);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {/* Same width and the same suppression of DrawerContent's built-in
          close button as the other drawers in the product. */}
      <DrawerContent className="w-full sm:w-[32rem] sm:max-w-[92vw] [&>button:last-child]:hidden">
        <DrawerHeader className="flex shrink-0 items-start justify-between gap-4">
          <DrawerTitle className="pr-0 text-lg">{title}</DrawerTitle>
          <IconButton
            aria-label="Close"
            variant="ghost"
            size="sm"
            className="-mr-2 -mt-1 shrink-0"
            onClick={() => onOpenChange(false)}
          >
            <Icon name="x" className="h-4 w-4" />
          </IconButton>
        </DrawerHeader>

        {/* The scrolling region (min-h-0 flex-1), so the footer stays pinned
            on short viewports. Everything in it is inert while generating. */}
        <div
          className={cn(
            "min-h-0 flex-1 space-y-5 overflow-y-auto p-6",
            isGenerating && "pointer-events-none opacity-70"
          )}
          aria-disabled={isGenerating || undefined}
        >
          <Field>
            <FieldLabel>
              Time window <span className="text-destructive">*</span>
            </FieldLabel>
            <Tabs
              value={mode}
              onValueChange={(v) => {
                setMode(v as ReportWindowMode);
                setSubmitFailed(false);
              }}
            >
              <TabsList className="w-full">
                <TabsTrigger value="dateRange" className="flex-1" disabled={isGenerating}>
                  Date range
                </TabsTrigger>
                <TabsTrigger value="relative" className="flex-1" disabled={isGenerating}>
                  Relative
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </Field>

          {isRange ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Quick select</p>
                <div className="grid grid-cols-3 gap-2">
                  {DATE_PRESETS.map((preset) => (
                    <Button
                      key={preset.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isGenerating}
                      aria-pressed={activePreset === preset.id}
                      className={chipClass(activePreset === preset.id)}
                      onClick={() => pickPreset(preset.id)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div
                className={cn(
                  "rounded-xl border p-3",
                  showError ? "border-destructive" : "border-border"
                )}
              >
                <Calendar
                  mode="range"
                  // Fills the card's width at the default cell height (flux
                  // 0.3.10's fullWidth), instead of a content-sized calendar
                  // floating in a wide card.
                  fullWidth
                  className="bg-transparent p-0"
                  month={month}
                  onMonthChange={setMonth}
                  endMonth={today}
                  disabled={{ after: today }}
                  selected={{ from: start, to: end }}
                  // react-day-picker's own range selection decides what each
                  // click does; the drawer only mirrors the result.
                  onSelect={(range) => {
                    setStart(range?.from);
                    setEnd(range?.to);
                    setSubmitFailed(false);
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Quick select</p>
                <div className="grid grid-cols-4 gap-2">
                  {RELATIVE_PRESETS.map((preset) => {
                    const active = sameRelative(relative, preset.value);
                    return (
                      <Button
                        key={preset.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isGenerating}
                        aria-pressed={active}
                        className={chipClass(active)}
                        onClick={() => {
                          setRelative(preset.value);
                          setSubmitFailed(false);
                        }}
                      >
                        {preset.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {RELATIVE_FIELDS.map(({ key, label }) => (
                  <Field key={key}>
                    <FieldLabel htmlFor={`report-range-${key}`}>{label}</FieldLabel>
                    <Input
                      id={`report-range-${key}`}
                      inputMode="numeric"
                      placeholder="0"
                      disabled={isGenerating}
                      aria-invalid={showError || undefined}
                      className={cn(showError && "border-destructive")}
                      value={relative[key] === "0" ? "" : relative[key]}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setRelative((prev) => ({ ...prev, [key]: digits || "0" }));
                        setSubmitFailed(false);
                      }}
                    />
                  </Field>
                ))}
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground">
                Counted back from the moment you click Generate &amp; Download. Combine units
                freely, for example 1 week and 3 days.
              </p>
            </div>
          )}

          {showError && (
            <FieldError role="alert" className="flex items-center gap-1.5">
              <Icon name="alert-circle" className="h-4 w-4 shrink-0" aria-hidden />
              {isRange
                ? "Select both a start and an end date."
                : "Enter how far back the report should go."}
            </FieldError>
          )}
        </div>

        <DrawerFooter className="flex-col gap-3 px-6 pb-5 pt-4">
          {summary && (
            <p className="flex items-start gap-2 text-sm leading-snug text-muted-foreground">
              <Icon name="calendar-days" className="mt-px h-4 w-4 shrink-0" aria-hidden />
              <span>{summary}</span>
            </p>
          )}
          <Button
            variant="primary"
            className="w-full"
            rightIcon={isGenerating ? undefined : <Icon name="download" className="h-4 w-4" />}
            isLoading={isGenerating}
            onClick={submit}
          >
            {isGenerating ? "Generating..." : "Generate & Download"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
