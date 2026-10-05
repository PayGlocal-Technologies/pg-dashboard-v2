"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useGet, usePost } from "@/lib/api/hooks";
import { api } from "@/lib/api/axios";
import { handleApiError } from "@/lib/api/handleApiError";
import { downloadBlob } from "@/lib/utils/format";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import {
  apiKeyStatusApi,
  generateRsaKeyApi,
  keysApi,
  payglocalCertificateApi,
  revokeKeyApi,
} from "@/features/dashboard/key-management-system/services";
import {
  fileNameFromDisposition,
  isKmsPartner,
  keyPathSegment,
} from "@/features/dashboard/key-management-system/helpers";
import type {
  ApiKeyStatusResponse,
  GenerateApiKeyResponse,
  GeneratedApiKey,
  KeyFile,
  KeyKind,
  MerchantKeysResponse,
} from "@/features/dashboard/key-management-system/types";

export const KEYS_QUERY_KEY = ["kms-keys"] as const;

/**
 * Everything a key call is addressed by, pg-dashboard's KMSTable rules:
 *
 *  - the MID: the header's selected one, else the first PA MID, else the
 *    profile's;
 *  - partner or not (isKmsPartner), which picks the route family;
 *  - whether API keys are on for the MID, and on which version: v2 when
 *    VERSION_2, for API-key calls only. A guest has no keys to ask about.
 */
export function useKmsScope() {
  const profile = useApp((s) => s.profile);
  const paMids = useApp((s) => s.paMids);
  const isGuestUser = useApp((s) => s.isGuestUser);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);
  const mid = selectedMid || paMids[0] || profile?.mid || "";
  const isPartner = isKmsPartner(profile);

  const { data } = useGet<ApiKeyStatusResponse>(
    ["kms-api-key-status", mid],
    mid ? apiKeyStatusApi(mid) : "",
    undefined,
    { enabled: !!mid && !isGuestUser }
  );

  return {
    mid,
    isPartner,
    isGuestUser,
    apiKeysEnabled: !!data?.data?.apiKeyStatus,
    apiKeyVersion: data?.data?.apiKeyVersion === "VERSION_2" ? ("v2" as const) : ("v1" as const),
  };
}

export type KmsScope = ReturnType<typeof useKmsScope>;

/** The address of a kind's list (and its revoke and API-key generate). */
function keysAddress(scope: KmsScope, kind: Exclude<KeyKind, "certificate">) {
  return {
    isPartner: scope.isPartner,
    mid: scope.mid,
    segment: keyPathSegment(kind, scope.isPartner),
    apiVersion: kind === "apiKey" ? scope.apiKeyVersion : ("v1" as const),
  };
}

/** A kind's keys. The certificate tab has nothing to fetch (see PAYGLOCAL_CERTIFICATE_ROW). */
export function useKeys(scope: KmsScope, kind: KeyKind) {
  const isFetchable = kind !== "certificate" && !!scope.mid && !scope.isGuestUser;
  const { data, isPending, isFetching, isError, refetch } = useGet<MerchantKeysResponse>(
    [...KEYS_QUERY_KEY, scope.mid, kind],
    isFetchable ? keysApi(keysAddress(scope, kind as Exclude<KeyKind, "certificate">)) : "",
    undefined,
    { enabled: isFetchable, staleTime: 0 }
  );
  return {
    keys: data?.data?.keys ?? [],
    isLoading: isFetchable && isPending,
    isFetching,
    isError,
    refetch,
  };
}

/** Revoke a key, then refresh the list. POST, empty body, as pg-dashboard sends it. */
export function useRevokeKey(scope: KmsScope, kind: Exclude<KeyKind, "certificate">) {
  const { mutate, isPending } = usePost<unknown, { dynamicUrl: string }>("", {
    invalidateQueries: [[...KEYS_QUERY_KEY]],
  });
  const revoke = (kid: string, onDone?: () => void) =>
    mutate(
      { dynamicUrl: revokeKeyApi(keysAddress(scope, kind), kid) },
      {
        onSuccess: () => {
          toast.success("Key revoked successfully");
          onDone?.();
        },
        onError: (error) => toast.error(error.message || "Failed to revoke key"),
      }
    );
  return { revoke, isRevoking: isPending };
}

/**
 * Generate an API key. The response is the only time its secret and salt are
 * ever available, so it is handed to `onGenerated` and kept nowhere else:
 * gcTime 0 drops it from React Query's mutation cache as soon as it lands.
 */
export function useGenerateApiKey(scope: KmsScope) {
  const { mutate, isPending } = usePost<GenerateApiKeyResponse, Record<string, never>>(
    scope.mid ? keysApi(keysAddress(scope, "apiKey")) : "",
    { invalidateQueries: [[...KEYS_QUERY_KEY]], gcTime: 0 }
  );
  const generate = (onGenerated: (key: GeneratedApiKey) => void) =>
    mutate(
      {},
      {
        onSuccess: (res) => {
          if (res?.data) onGenerated(res.data);
          else toast.error("Failed to generate API Key");
        },
        onError: (error) => toast.error(error.message || "Failed to generate API Key"),
      }
    );
  return { generate, isGenerating: isPending };
}

/** POSTs or GETs a file and names it from the response, as pg-dashboard's fetchFileBlob. */
async function fetchKeyFile(
  method: "get" | "post",
  url: string,
  fallbackName: string
): Promise<KeyFile> {
  try {
    const res =
      method === "post"
        ? await api.post<Blob>(url, undefined, { responseType: "blob" })
        : await api.get<Blob>(url, { responseType: "blob" });
    const disposition = res.headers["content-disposition"] as string | undefined;
    return { blob: res.data, fileName: fileNameFromDisposition(disposition, fallbackName) };
  } catch (error) {
    return handleApiError(error as AxiosError);
  }
}

/**
 * Generate an RSA key pair. The server streams back the private key, and this
 * is the only time it can be downloaded: it goes to `onGenerated`, never to a
 * cache, and the caller drops it once it has been saved or dismissed.
 */
export function useGenerateRsaKey(scope: KmsScope) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const generate = (onGenerated: (file: KeyFile) => void) => {
    setIsGenerating(true);
    fetchKeyFile("post", generateRsaKeyApi(scope.isPartner, scope.mid), "private-key.pem")
      .then(onGenerated)
      .catch(() => toast.error("Failed to generate the RSA key"))
      .finally(() => {
        setIsGenerating(false);
        // The new key joins the list, as pg-dashboard refetches after generating.
        void queryClient.invalidateQueries({ queryKey: [...KEYS_QUERY_KEY] });
      });
  };
  return { generate, isGenerating };
}

/** Download PayGlocal's public certificate (the same for every merchant). */
export function useCertificateDownload() {
  const [isDownloading, setIsDownloading] = useState(false);
  const download = () => {
    setIsDownloading(true);
    fetchKeyFile("get", payglocalCertificateApi, "payglocal-certificate.pem")
      .then(({ blob, fileName }) => downloadBlob(blob, fileName))
      .catch(() => toast.error("Failed to download file"))
      .finally(() => setIsDownloading(false));
  };
  return { download, isDownloading };
}
