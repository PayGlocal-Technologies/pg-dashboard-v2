"use client";

import { useEffect, useState } from "react";

/**
 * SSR-safe media query hook. Always starts at `false` (matching the
 * server, which has no `window`) so the first client render matches the
 * server-rendered HTML exactly — reading `window.matchMedia` directly in a
 * lazy initializer would evaluate differently during hydration than during
 * SSR and trigger a hydration mismatch. The real value is applied one frame
 * later via `requestAnimationFrame`, nested inside the effect rather than
 * called synchronously in its body (this project's React Compiler lint
 * forbids that — see the `setInterval` pattern in CLAUDE.md).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);

    const raf = requestAnimationFrame(() => setMatches(mediaQueryList.matches));

    function handleChange(event: MediaQueryListEvent) {
      setMatches(event.matches);
    }
    mediaQueryList.addEventListener("change", handleChange);

    return () => {
      cancelAnimationFrame(raf);
      mediaQueryList.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}
