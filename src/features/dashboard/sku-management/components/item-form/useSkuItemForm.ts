"use client";

import { useRef } from "react";
import { useForm } from "@tanstack/react-form";
import { emptySkuItemForm } from "@/features/dashboard/sku-management/schemas";
import type { SkuItemFormValues } from "@/features/dashboard/sku-management/types";

interface UseSkuItemFormOptions {
  /** Pre-filled values for Edit; omit for a blank Add form. */
  initialValues?: SkuItemFormValues;
  /** Called only once every field validator has passed. `keepOpen` is what
   *  distinguishes "Save and add another" from "Add item". */
  onValidSubmit: (values: SkuItemFormValues, keepOpen: boolean) => void;
}

/**
 * Owns the item form's instance and its two submit routes.
 *
 * Exists as a hook, rather than a `useForm` call inlined in the modal, so the
 * form's type has a name: TanStack infers it through a dozen generic
 * parameters that can't reasonably be written out by hand, and every section
 * component needs to declare it as a prop. `SkuItemFormApi` below is that
 * name, derived from this hook rather than restated.
 */
export function useSkuItemForm({ initialValues, onValidSubmit }: UseSkuItemFormOptions) {
  // Which button started this submit. A ref, not state: it's written and read
  // in the same tick, and re-rendering on it would achieve nothing.
  const keepOpenRef = useRef(false);

  const form = useForm({
    defaultValues: initialValues ?? emptySkuItemForm(),
    onSubmit: ({ value, formApi }) => {
      onValidSubmit(value, keepOpenRef.current);
      if (keepOpenRef.current) {
        // Save and add another: back to a blank form, ready to type into.
        formApi.reset(emptySkuItemForm());
      }
    },
  });

  const submitWith = (keepOpen: boolean) => {
    keepOpenRef.current = keepOpen;
    void form.handleSubmit();
  };

  return { form, submitWith };
}

/** The item form's instance type — what every section takes as its `form`. */
export type SkuItemFormApi = ReturnType<typeof useSkuItemForm>["form"];
