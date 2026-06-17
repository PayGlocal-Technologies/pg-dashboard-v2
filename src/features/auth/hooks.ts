"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { CompactEncrypt, importSPKI } from "jose";
import { useApp } from "@/stores/useApp";

const GLOBAL_TENANT_SUBDOMAIN = "inreach";
const GLOBAL_PARAM = "isGlobal";
const FALSY = new Set(["false", "0", "no", "off"]);

export function useGlobalTenant(): boolean {
  const searchParams = useSearchParams();

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname.split(":")[0].toLowerCase();
    if (hostname.split(".")[0] === GLOBAL_TENANT_SUBDOMAIN) return true;
  }

  if (!searchParams.has(GLOBAL_PARAM)) return false;
  const raw = searchParams.get(GLOBAL_PARAM);
  if (raw === null || raw === "") return true;
  return !FALSY.has(raw.toLowerCase().trim());
}

export function useCountdown(startTime: number, durationSeconds: number): number {
  const [remaining, setRemaining] = useState(() => {
    if (!startTime) return 0;
    const elapsed = (Date.now() - startTime) / 1000;
    return Math.max(0, Math.ceil(durationSeconds - elapsed));
  });

  useEffect(() => {
    if (!startTime) return;
    const id = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const r = Math.max(0, Math.ceil(durationSeconds - elapsed));
      setRemaining(r);
      if (r <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [startTime, durationSeconds]);

  return startTime ? remaining : 0;
}

const ALG = "RSA-OAEP-256";
const ENC = "A128CBC-HS256";

export interface EncryptedPayload {
  isEnc: "true" | "false";
  kid?: string;
  payload: unknown;
}

export function useEncryptPayload(): (payload: unknown) => Promise<EncryptedPayload> {
  const publicKey = useApp((s) => s.publicKey);
  const kid = useApp((s) => s.kid);
  const isEnc = useApp((s) => s.isEnc);
  const setEnc = useApp((s) => s.setEnc);

  return useCallback(
    async (payload: unknown): Promise<EncryptedPayload> => {
      if (!isEnc || !publicKey) {
        return { isEnc: "false", payload };
      }
      try {
        const key = await importSPKI(publicKey, ALG);
        const jwe = await new CompactEncrypt(new TextEncoder().encode(JSON.stringify(payload)))
          .setProtectedHeader({ alg: ALG, enc: ENC })
          .encrypt(key);
        return { isEnc: "true", kid: kid ?? undefined, payload: jwe };
      } catch (e) {
        setEnc(false);
        throw new Error(`Failed to encrypt payload: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
    [isEnc, publicKey, kid, setEnc]
  );
}
