"use client";

import { useCallback } from "react";
import { logoutApi } from "@/api";
import { useGet } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";

export function useLogout(): { logout: () => void; isLoading: boolean } {
  const reset = useApp((s) => s.reset);
  const resetAccountSetup = useAccountSetup((s) => s.reset);
  const { refetch, isFetching } = useGet(["logout"], logoutApi, { enabled: false });

  const logout = useCallback(() => {
    refetch().catch(() => {}); // best-effort, don't block on server response
    window.location.href = "/login";
    reset();
    resetAccountSetup();
  }, [refetch, reset, resetAccountSetup]);

  return { logout, isLoading: isFetching };
}
