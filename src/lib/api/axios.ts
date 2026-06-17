import axios from "axios";

/**
 * Shared axios instance. All /gcc/* requests are proxied to the correct
 * backend by Next.js rewrites (see next.config.ts). The browser stays
 * same-origin — no CORS issues in dev or uat.
 */
export const api = axios.create({
  headers: {
    "Content-Type": "application/json",
    "x-app-version": "v2",
    ...(process.env.NODE_ENV === "development" ? { "x-gl-test-env": "true" } : {}),
  },
});
