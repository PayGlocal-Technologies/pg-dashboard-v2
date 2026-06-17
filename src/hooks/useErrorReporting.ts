"use client";
import { useEffect, useCallback } from "react";
import { usePost } from "@/lib/api/hooks";
import { usePathname } from "next/navigation";
import { PUBLIC_ROUTE_PREFIXES } from "@/constants/publicRoutes";

interface ErrorReportPayload {
  errorMessage: string;
  stackTrace: string[];
  pagePath: string;
}

function extractComponentNames(stack: string | undefined): string[] {
  if (!stack) return [];
  return stack
    .split("\n")
    .map((line) => {
      const match = line.match(/\s+at\s+([^(]+)/);
      return match ? match[1].trim() : null;
    })
    .filter((name): name is string => name !== null);
}

export function useErrorReporting(error: Error | null): void {
  const pathname = usePathname();
  const { mutate: sendErrorReport } = usePost<unknown, ErrorReportPayload>("/gcc/v3/error/gcc-ui");

  const pagePath = typeof window !== "undefined" ? window.location.pathname : "";
  const isPublicRoute = PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  const submitErrorReport = useCallback(
    ({ errorMessage, stackTrace }: { errorMessage: string; stackTrace: string[] }) => {
      if (isPublicRoute) return;
      sendErrorReport({ errorMessage, stackTrace, pagePath });
    },
    [sendErrorReport, pagePath, isPublicRoute]
  );

  useEffect(() => {
    if (error) {
      submitErrorReport({
        errorMessage: error.message,
        stackTrace: extractComponentNames(error.stack),
      });
    }
  }, [error, submitErrorReport]);
}
