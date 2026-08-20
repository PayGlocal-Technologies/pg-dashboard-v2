"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui";
import { cn } from "@/lib/utils";

interface SegmentedTabsOption {
  value: string;
  label: string;
}

interface SegmentedTabsProps {
  options: readonly SegmentedTabsOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** Flat underline-style status filter, no pill background, the active tab
 * gets a colored underline instead of a filled background. Shared by
 * Transactions, Payment Links and Settlement Reports so all three status
 * filters look identical. */
export function SegmentedTabs({ options, value, onChange, className }: SegmentedTabsProps) {
  return (
    <Tabs value={value} onValueChange={onChange} className={className}>
      <TabsList className="h-auto gap-5 rounded-none border-0 bg-transparent p-0">
        {options.map((opt) => (
          <TabsTrigger
            key={opt.value}
            value={opt.value}
            className={cn(
              "h-auto rounded-none border-b-2 border-transparent px-0 py-1.5 text-sm font-medium text-muted-foreground shadow-none transition-colors",
              "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none",
              // Override TabsTrigger's default focus-visible ring (a thick,
              // rectangular box) which clashes with this flat, underline-only
              // style, a color shift + the same underline the active tab
              // already uses reads as focus without the boxy outline.
              "focus-visible:text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none",
              "focus-visible:border-muted-foreground"
            )}
          >
            {opt.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
