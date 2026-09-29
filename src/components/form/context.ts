import { createFormHookContexts } from "@tanstack/react-form";

/**
 * The React contexts the app form layer runs on. Split out from AppForm so the
 * field components can read them without importing the hook that registers
 * those same components (which would be a circular import).
 */
export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();
