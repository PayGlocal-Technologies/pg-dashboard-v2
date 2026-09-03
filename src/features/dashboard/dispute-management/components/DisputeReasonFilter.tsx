"use client";

import { Button, Popover, PopoverContent, PopoverTrigger } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { DISPUTE_REASON_OPTIONS } from "@/features/dashboard/dispute-management/constants";

interface DisputeReasonFilterProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

/** Same trigger-pill styling as TransactionAmountFilter/TransactionDateTimeFilter,
 * a single-select dropdown since a dispute only ever has one reason. */
export function DisputeReasonFilter({ value, onChange }: DisputeReasonFilterProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<Icon name="plus" className="h-3 w-3" />}
          className={cn(
            "relative h-auto rounded-full border-dotted bg-transparent px-4 py-2 text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground",
            value && "text-foreground"
          )}
        >
          {value ?? "Reason"}
          {value && (
            <span
              className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary"
              aria-hidden="true"
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-1.5">
        <div className="flex flex-col gap-0.5">
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(undefined)}
              className="h-auto min-h-0 justify-start rounded-md px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              Clear selection
            </Button>
          )}
          {DISPUTE_REASON_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(opt.value)}
              className={cn(
                "h-auto min-h-0 justify-start rounded-md px-2.5 py-2 text-xs font-medium hover:bg-muted",
                value === opt.value ? "text-primary" : "text-foreground"
              )}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
