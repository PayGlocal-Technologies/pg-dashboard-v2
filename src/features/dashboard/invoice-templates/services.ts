import { BASE_URL_V3 } from "@/api";

/** GET lists this merchant's templates; POST creates one. */
export const invoiceTemplatesApi = (mid: string): string =>
  mid ? `${BASE_URL_V3}/mca-invoice/${mid}/templates` : "";

/**
 * One template: GET reads it, PUT replaces it wholesale, DELETE removes it.
 *
 * Note the read has a side effect the other endpoints do not: it bumps the
 * template's `lastUsedAt`, which is how the API records that a template was
 * used. See `markUsed` in hooks.ts.
 */
export const invoiceTemplateApi = (mid: string, templateId: string): string =>
  mid && templateId ? `${invoiceTemplatesApi(mid)}/${templateId}` : "";
