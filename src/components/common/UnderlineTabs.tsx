"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui";

export interface UnderlineTab {
  value: string;
  label: string;
}

/**
 * Page-level tab bar with a single shared active indicator that slides
 * between tabs, rather than each tab drawing its own underline. Its
 * position/width are measured from the DOM (text-based tabs have different
 * widths, so this can't be derived from props/state alone) and it's
 * positioned to sit flush on the tab row's own bottom border instead of
 * floating below the label.
 *
 * `actions` renders flush right on the same row as the tabs (the tabs stay
 * left-aligned), which is where pages put their primary CTA.
 */
export function UnderlineTabs({
  tabs,
  value,
  onValueChange,
  actions,
}: {
  tabs: readonly UnderlineTab[];
  value: string;
  onValueChange: (value: string) => void;
  actions?: ReactNode;
}) {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    const measure = () => {
      const el = tabRefs.current[value];
      if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    };
    // Deferred to a rAF/resize callback (not called synchronously in the
    // effect body) since it depends on post-layout DOM measurements that
    // can't be derived from render — see CLAUDE.md's purity rules.
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [value]);

  return (
    <Tabs value={value} onValueChange={onValueChange}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* relative here (not on the row wrapper) so the sliding indicator
            measures against the tab strip itself, unaffected by whatever
            `actions` renders beside it. */}
        <TabsList className="relative h-auto justify-start gap-5 rounded-none border-0 bg-transparent p-0">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              ref={(el) => {
                tabRefs.current[tab.value] = el;
              }}
              value={tab.value}
              className="h-auto rounded-none px-0 py-2.5 text-[13px] font-medium text-muted-foreground shadow-none data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              {tab.label}
            </TabsTrigger>
          ))}
          <span
            aria-hidden
            className="absolute bottom-0 h-0.5 bg-primary transition-all duration-200 ease-out"
            style={{
              left: indicator?.left ?? 0,
              width: indicator?.width ?? 0,
              opacity: indicator ? 1 : 0,
            }}
          />
        </TabsList>

        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </Tabs>
  );
}
