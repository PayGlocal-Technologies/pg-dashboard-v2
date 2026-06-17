import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { api } from "@/lib/api/axios";
import { handleApiError } from "@/lib/api/handleApiError";
import { useApp } from "@/stores/useApp";

type HttpMethod = "post" | "put" | "patch" | "delete";

// ─── Fetchers ────────────────────────────────────────────────────────────────

async function axiosFetcher<T>(url: string, headers?: Record<string, string>): Promise<T> {
  try {
    const res = await api.get<T>(url, { headers });
    useApp.getState().resetTimer();
    return res.data;
  } catch (error) {
    return handleApiError(error as AxiosError);
  }
}

async function axiosPostFetcher<TData, TVariables>(
  url: string,
  variables: TVariables
): Promise<TData> {
  try {
    const res = await api.post<TData>(url, variables);
    useApp.getState().resetTimer();
    return res.data;
  } catch (error) {
    return handleApiError(error as AxiosError);
  }
}

// ─── Option types ─────────────────────────────────────────────────────────────

type GetOptions<TData, TError> = Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn"> & {
  headers?: Record<string, string>;
};

/**
 * invalidateQueries behaviour mirrors pg-dashboard:
 *   false          → skip invalidation entirely
 *   QueryKey       → invalidate that single key
 *   QueryKey[]     → invalidate each key in the array
 *   omitted / true → invalidate all queries
 */
// In this version of @tanstack/query-core, onSuccess has 4 params:
// (data, variables, onMutateResult, mutationFunctionContext).
// The 4th generic is TOnMutateResult (result of onMutate), not TContext.
type MutationOptions<TData, TVariables, TError, TOnMutateResult = unknown> = Omit<
  UseMutationOptions<TData, TError, TVariables, TOnMutateResult>,
  "mutationFn"
> & {
  invalidateQueries?: QueryKey | QueryKey[] | boolean;
  /** Set to true to receive a Blob response (file download). */
  download?: boolean;
};

// ─── Core mutation factory ─────────────────────────────────────────────────────

/**
 * Mirrors pg-dashboard's useApiMutation. Key behaviours:
 * - Extracts `dynamicUrl`, `customHeaders`, `reqBody` from the variables object
 *   so callers can override the URL or headers per-call (e.g. SSO).
 * - Supports `download: true` for blob responses.
 * - Full invalidateQueries variants.
 */
function useApiMutation<TData, TVariables, TError = Error, TOnMutateResult = unknown>(
  method: HttpMethod,
  url: string,
  options?: MutationOptions<TData, TVariables, TError, TOnMutateResult>
): UseMutationResult<TData, TError, TVariables, TOnMutateResult> {
  const queryClient = useQueryClient();
  const { invalidateQueries, download, onSuccess, ...rest } = options ?? {};

  return useMutation<TData, TError, TVariables, TOnMutateResult>({
    mutationFn: async (body: TVariables) => {
      const { dynamicUrl, customHeaders, reqBody, ...restBody } = (body ?? {}) as {
        dynamicUrl?: string;
        customHeaders?: Record<string, string>;
        reqBody?: object;
      };
      const finalUrl = dynamicUrl ?? url;

      try {
        const isFormData = body instanceof FormData;
        const requestBody = isFormData ? body : (reqBody ?? restBody);
        const headers = customHeaders ?? {
          "Content-Type": isFormData ? "multipart/form-data" : "application/json",
        };

        const res =
          method === "delete"
            ? await api.delete<TData>(finalUrl, { data: requestBody, headers })
            : await api[method]<TData>(finalUrl, requestBody as TVariables, {
                headers,
                responseType: download ? "blob" : "json",
              });

        useApp.getState().resetTimer();
        return res.data;
      } catch (error) {
        return handleApiError(error as AxiosError);
      }
    },

    ...rest,

    // Use rest-args spread so this stays correct regardless of how many
    // parameters the onSuccess signature has in this version of react-query.
    onSuccess: (...args) => {
      if (invalidateQueries !== false) {
        if (Array.isArray(invalidateQueries)) {
          invalidateQueries.forEach(
            (key: QueryKey) => void queryClient.invalidateQueries({ queryKey: key })
          );
        } else if (invalidateQueries && invalidateQueries !== true) {
          void queryClient.invalidateQueries({ queryKey: invalidateQueries as QueryKey });
        } else {
          void queryClient.invalidateQueries();
        }
      }

      onSuccess?.(...args);
    },
  });
}

// ─── GET hooks ────────────────────────────────────────────────────────────────

/**
 * GET query. Matches pg-dashboard's signature:
 *   useGet(queryKey, url, dynamicUrl?, options?)
 * Query key includes url + dynamicUrl + headers for correct cache isolation.
 */
export function useGet<TData = unknown, TError = Error>(
  queryKey: QueryKey,
  url: string,
  dynamicUrl?: string | null,
  options?: GetOptions<TData, TError>
): UseQueryResult<TData, TError>;
/** Overload: omit dynamicUrl (pg-dashboard-v2 legacy signature). */
export function useGet<TData = unknown, TError = Error>(
  queryKey: QueryKey,
  url: string,
  options?: GetOptions<TData, TError>
): UseQueryResult<TData, TError>;
export function useGet<TData = unknown, TError = Error>(
  queryKey: QueryKey,
  url: string,
  dynamicUrlOrOptions?: string | null | GetOptions<TData, TError>,
  optionsMaybe?: GetOptions<TData, TError>
): UseQueryResult<TData, TError> {
  let dynamicUrl: string | null | undefined;
  let options: GetOptions<TData, TError> | undefined;

  if (typeof dynamicUrlOrOptions === "string" || dynamicUrlOrOptions === null) {
    dynamicUrl = dynamicUrlOrOptions;
    options = optionsMaybe;
  } else {
    dynamicUrl = undefined;
    options = dynamicUrlOrOptions;
  }

  const { headers, ...queryOptions } = options ?? {};
  const finalUrl = dynamicUrl ?? url;

  return useQuery<TData, TError>({
    queryKey: [...queryKey, finalUrl, headers] as const,
    queryFn: () => axiosFetcher<TData>(finalUrl, headers),
    retry: 1,
    refetchOnWindowFocus: false,
    ...queryOptions,
  });
}

interface QueryConfig<TData, TError> {
  queryKey: QueryKey;
  url: string;
  options?: GetOptions<TData, TError>;
}

/** Parallel GETs. Aggregates loading/error and exposes a refetchAll. */
export function useMultipleGet<TData = unknown, TError = Error>(
  queries: QueryConfig<TData, TError>[]
): {
  isLoading: boolean;
  isError: boolean;
  data: TData[] | undefined;
  results: UseQueryResult<TData, TError>[];
  refetchAll: () => void;
} {
  const results = useQueries({
    queries: queries.map(({ queryKey, url, options }) => {
      const { headers, ...queryOptions } = options ?? {};
      return {
        queryKey: [...queryKey, url, headers] as const,
        queryFn: () => axiosFetcher<TData>(url, headers),
        retry: 1,
        refetchOnWindowFocus: false,
        enabled: queryOptions.enabled ?? false,
        ...queryOptions,
      };
    }),
  }) as UseQueryResult<TData, TError>[];

  return {
    isLoading: results.some((r) => r.isLoading),
    isError: results.some((r) => r.isError),
    data: results.every((r) => r.data !== undefined)
      ? results.map((r) => r.data as TData)
      : undefined,
    results,
    refetchAll: () => results.forEach((r) => void r.refetch()),
  };
}

// ─── POST-based query (server-cached POST) ────────────────────────────────────

/** useQuery that sends a POST body — useful for complex filter/search endpoints. */
export function usePostQuery<TData = unknown, TVariables = unknown, TError = Error>(
  queryKey: QueryKey,
  url: string,
  variables: TVariables,
  options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">,
  enabled = true
): UseQueryResult<TData, TError> {
  return useQuery<TData, TError>({
    queryKey: [...queryKey, url, variables] as const,
    queryFn: () => axiosPostFetcher<TData, TVariables>(url, variables),
    enabled,
    retry: 1,
    refetchOnWindowFocus: false,
    ...options,
  });
}

// ─── Mutation hooks ────────────────────────────────────────────────────────────

export function usePost<
  TData = unknown,
  TVariables = unknown,
  TError = Error,
  TOnMutateResult = unknown,
>(
  url: string,
  options?: MutationOptions<TData, TVariables, TError, TOnMutateResult>
): UseMutationResult<TData, TError, TVariables, TOnMutateResult> {
  return useApiMutation("post", url, options);
}

export function usePut<
  TData = unknown,
  TVariables = unknown,
  TError = Error,
  TOnMutateResult = unknown,
>(
  url: string,
  options?: MutationOptions<TData, TVariables, TError, TOnMutateResult>
): UseMutationResult<TData, TError, TVariables, TOnMutateResult> {
  return useApiMutation("put", url, options);
}

export function usePatch<
  TData = unknown,
  TVariables = unknown,
  TError = Error,
  TOnMutateResult = unknown,
>(
  url: string,
  options?: MutationOptions<TData, TVariables, TError, TOnMutateResult>
): UseMutationResult<TData, TError, TVariables, TOnMutateResult> {
  return useApiMutation("patch", url, options);
}

export function useDelete<
  TData = unknown,
  TVariables = unknown,
  TError = Error,
  TOnMutateResult = unknown,
>(
  url: string,
  options?: MutationOptions<TData, TVariables, TError, TOnMutateResult>
): UseMutationResult<TData, TError, TVariables, TOnMutateResult> {
  return useApiMutation("delete", url, options);
}
