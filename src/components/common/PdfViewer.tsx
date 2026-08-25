"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Button, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

/**
 * pdf.js runs its parser in a worker, which has to be pointed at a script.
 *
 * pg-dashboard fetches this from `https://unpkg.com/pdfjs-dist@<version>/…` at
 * runtime. Here it resolves out of node_modules and is bundled, which keeps a
 * page that renders financial documents from depending on a third-party CDN
 * being reachable, and lets it work behind a strict CSP or offline.
 *
 * The worker and the API must be the same pdf.js version or pdf.js refuses to
 * load with a version-mismatch error, which is why the installed pdfjs-dist is
 * pinned to exactly the version react-pdf depends on rather than floating to
 * the newest major.
 */
if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
}

/** pdf.js rejects with this name when a document needs a password. */
const PASSWORD_ERROR = "PasswordException";

/**
 * Horizontal breathing room subtracted from the measured width before the page
 * is rasterised. Guards against a sub-pixel rounding overflow putting the page
 * a hair wider than its container.
 */
const PAGE_INSET = 8;

interface PdfViewerProps {
  url: string | undefined;
  /** Used in the download fallback's filename and the frame's accessible name. */
  title: string;
  /** Page navigation and the download button. */
  showToolbar?: boolean;
  /**
   * Renders an Expand control in the toolbar. Omit inside the expanded view
   * itself, which is what stops it offering to expand again.
   */
  onExpand?: () => void;
  /** Height of the scroll area. Overridden by the full-screen view. */
  heightClassName?: string;
  className?: string;
}

/**
 * Renders a PDF with react-pdf.
 *
 * Deliberately narrower than pg-dashboard's viewer: no password prompt. A
 * merchant-uploaded invoice can be encrypted, and rather than carry the
 * password-entry flow this says so plainly and offers the download, which is
 * where they would read it anyway.
 */
export function PdfViewer({
  url,
  title,
  showToolbar = true,
  onExpand,
  heightClassName = "max-h-[70vh] min-h-[32rem]",
  className,
}: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState(560);
  const [totalPages, setTotalPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [failure, setFailure] = useState<"encrypted" | "unreadable" | null>(null);

  // The page is rasterised at a fixed pixel width, so it is re-measured on every
  // container resize or it renders blurry.
  //
  // clientWidth, not the observer's contentRect: ResizeObserver reports the
  // border box, which does not change when a vertical scrollbar appears, so a
  // page sized from it stays as wide as the container was *before* the
  // scrollbar took ~15px away, and overflows sideways. clientWidth excludes the
  // scrollbar, and `scrollbar-gutter: stable` on the container reserves that
  // space up front so the value is the same whether or not the bar is showing.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const width = Math.floor(el.clientWidth) - PAGE_INSET;
      // setState lives in the observer callback, not the effect body.
      if (width > 0) setPageWidth(width);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
    // Re-run when the container appears. On mount `url` is undefined — the
    // presigned link is still being fetched — so the component returns the
    // shimmer and this div does not exist yet. With an empty dep array the
    // effect ran once against a null ref, bailed, and never attached the
    // observer, so `pageWidth` stayed at its 560px initial guess forever: in
    // any column narrower than that the page rendered too wide and the
    // overflow-x-hidden below sliced the right-hand side off the document.
  }, [url, failure]);

  const handleLoad = useCallback(({ numPages }: { numPages: number }) => {
    setTotalPages(numPages);
    setPageNumber(1);
    setFailure(null);
  }, []);

  const handleError = useCallback((error: Error) => {
    setFailure(error?.name === PASSWORD_ERROR ? "encrypted" : "unreadable");
  }, []);

  // react-pdf asks for a password instead of erroring when one is needed, so
  // the callback is what surfaces the encrypted case at all. Not calling back
  // with a password leaves the document unopened, which is the intent.
  const handlePassword = useCallback(() => {
    setFailure("encrypted");
  }, []);

  const openInNewTab = () => {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!url) {
    return <Shimmer className={cn("w-full rounded-lg", heightClassName, className)} />;
  }

  if (failure) {
    return (
      <div
        className={cn(
          "flex w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center",
          heightClassName,
          className
        )}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Icon name={failure === "encrypted" ? "lock" : "alert-circle"} className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {failure === "encrypted"
              ? "This PDF is password protected"
              : "Couldn't display this PDF"}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {failure === "encrypted"
              ? "Download it to open with the password."
              : "The document could not be read. Downloading it may still work."}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
          onClick={openInNewTab}
        >
          Download PDF
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {showToolbar && totalPages > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-2 py-1.5">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Previous page"
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber((n) => Math.max(1, n - 1))}
              className="h-7 w-7 p-0"
            >
              <Icon name="chevron-left" className="h-3.5 w-3.5" />
            </Button>
            <span className="min-w-[5rem] text-center text-[12px] tabular-nums text-muted-foreground">
              {pageNumber} / {totalPages}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Next page"
              disabled={pageNumber >= totalPages}
              onClick={() => setPageNumber((n) => Math.min(totalPages, n + 1))}
              className="h-7 w-7 p-0"
            >
              <Icon name="chevron-right" className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            {onExpand && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<Icon name="expand" className="h-3.5 w-3.5" />}
                onClick={onExpand}
                className="h-7 text-[12px] text-muted-foreground hover:text-foreground"
              >
                Expand
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
              onClick={openInNewTab}
              className="h-7 text-[12px] text-muted-foreground hover:text-foreground"
            >
              Download
            </Button>
          </div>
        </div>
      )}

      {/* Vertical scrolling only. overflow-x-hidden is the backstop: the page is
          already sized to fit, so anything sideways would be a rounding artefact
          rather than content worth reaching. */}
      <div
        ref={containerRef}
        className={cn(
          "w-full overflow-y-auto overflow-x-hidden rounded-lg border border-border bg-muted [scrollbar-gutter:stable]",
          heightClassName
        )}
      >
        <Document
          file={url}
          onLoadSuccess={handleLoad}
          onLoadError={handleError}
          onPassword={handlePassword}
          loading={<Shimmer className="h-[32rem] w-full" />}
          error={
            <div className="p-8 text-center text-[13px] text-muted-foreground">
              Couldn&apos;t load the document.
            </div>
          }
          aria-label={title}
        >
          <Page
            pageNumber={pageNumber}
            width={pageWidth}
            renderAnnotationLayer
            renderTextLayer
            loading={<Shimmer className="h-[32rem] w-full" />}
          />
        </Document>
      </div>
    </div>
  );
}
