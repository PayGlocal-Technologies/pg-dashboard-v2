import { AxiosError } from "axios";
import { api } from "@/lib/api/axios";
import { stripBasePath, withBasePath } from "@/constants/basePath";

// Session-ending messages that trigger a redirect back to /login.
const SESSION_MESSAGES = new Set([
  "You will be logged out due to inactivity. Please login again.",
  "Invalid Session/Authentication Cookie",
  "Didn't create Internal AuthN Token",
  "Authentication failed, please contact support",
  "Authentication failed, invalid internal token",
]);

// Human-readable overrides for specific raw server messages.
const MESSAGE_MAP: Record<string, string> = {
  "Invalid Session/Authentication Cookie":
    "You will be logged out due to inactivity. Please login again.",
  "Didn't create Internal AuthN Token":
    "You will be logged out due to inactivity. Please login again.",
  "Authentication failed, please contact support":
    "You will be logged out due to inactivity. Please login again.",
  "Authentication failed, invalid internal token":
    "You will be logged out due to inactivity. Please login again.",
};

async function reportError(error: AxiosError): Promise<void> {
  try {
    const { status, config } = error.response || {};
    let errorMessage = error.message;
    const data = error.response?.data;
    if (data && typeof data === "object") {
      const d = data as { errors?: { displayMessage?: string }; message?: string };
      if (d.errors?.displayMessage) errorMessage = d.errors.displayMessage;
      else if (d.message) errorMessage = d.message;
    }
    await api.post("/gcc/v3/error/gcc-ui", {
      errorMessage,
      pagePath: typeof window !== "undefined" ? window.location.pathname : "",
      reasonCode: status !== undefined ? String(status) : "",
      apiUri: config?.url ?? "",
      method: config?.method ? config.method.toUpperCase() : "",
    });
  } catch {
    // Never throw from error reporter.
  }
}

/**
 * Sends the browser back to the login page, remembering where it was.
 *
 * Both halves have to think about the base path, because `window.location` is a
 * raw browser navigation: Next's `basePath` only rewrites what goes through the
 * framework (next/link, next/navigation, next/image, `public/`), so this is
 * exactly the case `withBasePath` exists for. Without it the redirect lands on
 * the origin's `/login`, which this app does not serve.
 *
 * The path being remembered is normalised the other way. `url.pathname` carries
 * the base path, and storing it in that shape defeated `isSafePath`'s
 * `path !== "/login"` guard in auth/helpers.ts — a session that expired *on* the
 * login page stored "/app-v2/login", which is not literally "/login", so the
 * next successful login was sent straight back to the login page.
 */
function redirectToLogin(): void {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  const redirectPath = stripBasePath(url.pathname) + url.search + url.hash;
  sessionStorage.setItem("redirect_after_login", redirectPath);

  window.location.replace(withBasePath("/login?timeout=true"));
}

/**
 * - Normalises server messages via the message map.
 * - On 401 with a session-ending message, redirects to /login after a short delay.
 * - Reports all other errors to /gcc/v3/error/gcc-ui.
 * - Always rejects with an object that matches the server envelope shape.
 */
export function handleApiError(error: unknown): never {
  if (!(error instanceof AxiosError)) {
    throw error instanceof Error ? error : new Error("Something went wrong. Please try again.");
  }

  const { status } = error.response || {};
  const rawMessage = (error.response?.data as { message?: string })?.message;
  const message = (rawMessage && MESSAGE_MAP[rawMessage]) ?? rawMessage ?? error.message;

  if (status === 401 && message && SESSION_MESSAGES.has(message)) {
    setTimeout(redirectToLogin, 1000);
  } else {
    void reportError(error);
  }

  const envelope = {
    ...(typeof error.response?.data === "object" && error.response.data !== null
      ? error.response.data
      : {}),
    message,
  };
  throw envelope as Error;
}
