"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { DEFAULT_DEAL_VALUES } from "@/features/dashboard/partner-deals/constants";
import type { CreateDealValues } from "@/features/dashboard/partner-deals/types";

/**
 * The Create Deal form, one instance for the whole page. Owned by
 * CreateDealPage and handed to each section, so every section and the Deal
 * Summary read and write the same state.
 */
export function useDealForm({
  onSubmit,
  onSubmitInvalid,
}: {
  onSubmit: (values: CreateDealValues) => Promise<void>;
  onSubmitInvalid: () => void;
}) {
  // A fresh copy per page visit, so edits never leak into the shared defaults.
  const [defaultValues] = useState<CreateDealValues>(() => structuredClone(DEFAULT_DEAL_VALUES));
  return useForm({
    defaultValues,
    onSubmit: ({ value }) => onSubmit(value),
    onSubmitInvalid: () => onSubmitInvalid(),
  });
}

export type DealForm = ReturnType<typeof useDealForm>;
