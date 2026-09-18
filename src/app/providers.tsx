"use client";

import { type ReactNode, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AppToaster } from "@/components/theme/AppToaster";
import { useProductContext } from "@/stores/useProductContext";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  // Reads the persisted product selection in once, on the client only — the
  // store sets skipHydration for the reason documented there. Effects run
  // child-first, so the header and sidebar have already rendered the server's
  // "PA" default by the time this lands, which is precisely what keeps the two
  // markups identical.
  //
  // rehydrate() returns a promise, so the state update happens in its
  // continuation rather than synchronously in this effect body — the pattern
  // CLAUDE.md's purity rule requires.
  useEffect(() => {
    void useProductContext.persist.rehydrate();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {children}
        <AppToaster />
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
    </QueryClientProvider>
  );
}
