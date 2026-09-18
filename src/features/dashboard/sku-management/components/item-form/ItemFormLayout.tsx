"use client";

import type { FormEvent, ReactNode } from "react";

/**
 * The item form's chrome: a fixed header, a scrolling body, and a pinned
 * footer. Holds no fields of its own, so sections can be added, removed, or
 * reordered by editing the `children` at the call site alone.
 *
 * The three-band split is what keeps the footer actions reachable however tall
 * the body grows — the media strip in particular changes height as images are
 * added, and only the middle band scrolls.
 */
export function ItemFormLayout({
  title,
  actions,
  onSubmit,
  children,
}: {
  title: string;
  /** Footer content — see ItemFormFooter. */
  actions: ReactNode;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}) {
  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-col" noValidate>
      {/* The Dialog/Drawer draws its own close button at the top right, so
          this row carries only the title. */}
      <div className="flex-shrink-0 border-b border-border px-5 py-4">
        <h2 className="text-[16px] font-semibold tracking-tight text-foreground">{title}</h2>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">{children}</div>

      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3.5">
        {actions}
      </div>
    </form>
  );
}
