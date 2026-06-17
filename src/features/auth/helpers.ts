import { getApps, getApp, initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { signInWithPopup, signInWithRedirect, type UserCredential } from "firebase/auth";
import { authProvider } from "@/features/auth/login/single-sign-on/authProvider";
import { useApp } from "@/stores/useApp";

export function firebaseConfigProvider(): Auth {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? `${window.location.host}/app`,
  };

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getAuth(app);
}

const ENV_VALUES = ["dev", "uat", "prod"] as const;

function getCdnEnv(): string {
  const env = process.env.NEXT_PUBLIC_ENV;
  if (env && ENV_VALUES.includes(env as (typeof ENV_VALUES)[number])) return env;
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname.split(".")[0];
    if (hostname && ENV_VALUES.includes(hostname as (typeof ENV_VALUES)[number])) return hostname;
  }
  return "dev";
}

function getKeyUrl(kid?: string): string {
  const env = getCdnEnv();
  const base =
    env === "prod"
      ? "https://cdn.payglocal.in/public-key"
      : `https://cdn.${env}.payglocal.in/public-key`;
  return kid ? `${base}/kid.txt` : `${base}/key.txt`;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

export async function getPublicKey(): Promise<void> {
  const { setPublicKey, setKid, setEnc } = useApp.getState();
  try {
    const [publicKey, kid] = await Promise.all([
      fetchText(getKeyUrl()),
      fetchText(getKeyUrl("kid")),
    ]);
    setPublicKey(publicKey.trim());
    setKid(kid.trim());
    setEnc(true);
  } catch {
    setPublicKey(null);
    setKid(null);
    setEnc(false);
  }
}

function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export async function handleSingleSignOn(
  id: "google" | "meta",
  onSuccess: (result: UserCredential) => void,
  setIsLoading: (v: boolean) => void,
  onError: (err: unknown) => void
): Promise<void> {
  try {
    setIsLoading(true);
    const provider = authProvider(id);
    if (isMobileDevice()) {
      localStorage.setItem("mLogin", "true");
      await signInWithRedirect(firebaseConfigProvider(), provider);
    } else {
      const result = await signInWithPopup(firebaseConfigProvider(), provider);
      onSuccess(result);
    }
  } catch (err) {
    onError(err);
  } finally {
    setIsLoading(false);
  }
}

export const DEFAULT_AUTHED_PATH = "/transactions";

const OLD_FLOW_PATH = "/gl-gcc/redirect";
const REDIRECT_KEY = "redirect_after_login";

function isSafePath(path: string | null): path is string {
  return !!path && path.startsWith("/") && !path.startsWith("//") && path !== "/login";
}

export function getRedirectionPath(userCreationType?: "NEW_FLOW" | "OLD_FLOW"): string {
  if (userCreationType === "OLD_FLOW") return OLD_FLOW_PATH;

  if (typeof window === "undefined") return DEFAULT_AUTHED_PATH;

  const fromParam = new URLSearchParams(window.location.search).get("from");
  if (isSafePath(fromParam)) return fromParam;

  const stored = window.sessionStorage.getItem(REDIRECT_KEY);
  window.sessionStorage.removeItem(REDIRECT_KEY);
  if (isSafePath(stored)) return stored;

  return DEFAULT_AUTHED_PATH;
}
