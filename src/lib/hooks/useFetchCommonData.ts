"use client";
import { useEffect, useMemo, useRef } from "react";
import { useMultipleGet, useGet } from "@/lib/api/hooks";
import {
  useApp,
  type PermissionsByLevel,
  type ProfileData,
  type MerchantEnabledProducts,
  type CountryCurrencyMap,
} from "@/stores/useApp";
import {
  profileApi,
  staticDataApi,
  entitlementsApi,
  merchantProductsApi,
  countryCurrencyMapApi,
} from "@/api";
import type { BaseResponse } from "@/types/common";
import { useRouter, usePathname } from "next/navigation";

type PolicyAccessLevel = "s" | "b" | "c";

type Permissions = {
  [feature: string]: {
    [policy: string]: {
      [access: string]: { policyAccessLevel: PolicyAccessLevel };
    };
  };
};

const getPermission = (
  permissions: Permissions,
  additionalPermissions: PermissionsByLevel
): PermissionsByLevel =>
  Object.keys(permissions).reduce<PermissionsByLevel>(
    (features, feature) => {
      const newFeatures = Object.keys(permissions[feature]).reduce<PermissionsByLevel>(
        (policies, policy) => {
          const newPolicies = Object.keys(permissions[feature][policy]).reduce<PermissionsByLevel>(
            (accessList, access) => {
              const accessLevel = permissions[feature][policy][
                access
              ].policyAccessLevel.toLowerCase() as PolicyAccessLevel;
              if (!accessList[accessLevel]) accessList[accessLevel] = [];
              accessList[accessLevel].push(access);
              return accessList;
            },
            { s: [], c: [], b: [] }
          );
          return {
            s: [...policies.s, ...newPolicies.s, ...additionalPermissions.s],
            b: [...policies.b, ...newPolicies.b, ...additionalPermissions.b],
            c: [...policies.c, ...newPolicies.c, ...additionalPermissions.c],
          };
        },
        { s: [], c: [], b: [] }
      );
      return {
        s: [...features.s, ...newFeatures.s],
        b: [...features.b, ...newFeatures.b],
        c: [...features.c, ...newFeatures.c],
      };
    },
    { s: [], c: [], b: [] }
  );

const queryKeys = {
  profile: ["profile"] as const,
  permissions: ["permissions"] as const,
  staticData: ["staticData"] as const,
  merchantProducts: ["merchantEnabledProducts"] as const,
  countryCurrencyMap: ["countryCurrencyMap"] as const,
};

interface Entitlements {
  "User Entitlements"?: Permissions;
}

interface StaticDataResponse {
  "static-data": string;
}

export function useFetchCommonData(): { isLoading: boolean; isError: boolean } {
  const setStaticData = useApp((state) => state.setStaticData);
  const setPermissions = useApp((state) => state.setPermissions);
  const setProfile = useApp((state) => state.setProfile);
  const setIsGuestUser = useApp((state) => state.setIsGuestUser);
  const setMerchantEnabledProducts = useApp((state) => state.setMerchantEnabledProducts);
  const setPaMids = useApp((state) => state.setPaMids);
  const setPaCbMids = useApp((state) => state.setPaCbMids);
  const setPacboMids = useApp((state) => state.setPacboMids);
  const setCountryCurrencyMap = useApp((state) => state.setCountryCurrencyMap);
  const setTidsInfo = useApp((state) => state.setTidsInfo);
  const setIsMultiMidUser = useApp((state) => state.setIsMultiMidUser);
  const setPartnerUser = useApp((state) => state.setPartnerUser);
  const setIsGlobalTenant = useApp((state) => state.setIsGlobalTenant);

  const router = useRouter();
  const pathname = usePathname();

  const PARTNER_ALLOWED_ROUTES = useMemo(
    () => [
      "/my-merchants",
      "/manage-merchants",
      "/partner-webhooks",
      "/commission",
      "/transactions",
      "/team-management",
      "/key-management-system",
      "/partner-merchant",
      "/onboarding",
    ],
    []
  );

  const initialQueries = [
    { queryKey: queryKeys.profile, url: profileApi, options: { enabled: false } },
    { queryKey: queryKeys.staticData, url: staticDataApi, options: { enabled: false } },
    { queryKey: queryKeys.permissions, url: entitlementsApi, options: { enabled: false } },
  ];

  const {
    isLoading: isInitialLoading,
    isError: isInitialError,
    data: initialData,
    refetchAll: refetchInitial,
  } = useMultipleGet<BaseResponse<unknown>>(initialQueries);

  const {
    data: merchantProductsData,
    isLoading: isMerchantProductsLoading,
    isError: isMerchantProductsError,
    refetch: refetchMerchantProducts,
  } = useGet<BaseResponse<MerchantEnabledProducts>>(
    queryKeys.merchantProducts,
    merchantProductsApi,
    undefined,
    { enabled: false }
  );

  const {
    data: countryCurrencyMapData,
    isLoading: isCountryCurrencyMapLoading,
    isError: isCountryCurrencyMapError,
    refetch: refetchCountryCurrencyMap,
  } = useGet<BaseResponse<{ countryCurrencyMap: CountryCurrencyMap[] }>>(
    queryKeys.countryCurrencyMap,
    countryCurrencyMapApi,
    undefined,
    { enabled: false }
  );

  const hasFetchedOnce = useRef(false);
  const hasFetchedEnabledProductsOnce = useRef(false);
  const hasFetchedCountryCurrencyMapOnce = useRef(false);

  useEffect(() => {
    const profile = initialData?.[0]?.data as ProfileData | undefined;
    if (!profile) return;
    const isPartner = profile?.role === "RESELLER_ADMIN" || profile?.onboardingType === "PARTNER";
    if (!isPartner) return;
    const isAllowed = PARTNER_ALLOWED_ROUTES.some((route) => pathname.startsWith(route));
    if (!isAllowed) {
      router.replace("/manage-merchants");
    }
  }, [initialData, pathname, router, PARTNER_ALLOWED_ROUTES]);

  useEffect(() => {
    if (!hasFetchedOnce.current) {
      hasFetchedOnce.current = true;
      refetchInitial();
    }
  }, [initialData, refetchInitial]);

  useEffect(() => {
    if (!isInitialLoading && !isInitialError && initialData?.length) {
      const profile = initialData?.[0]?.data as ProfileData;

      setPartnerUser(profile?.role === "RESELLER_ADMIN" || profile?.onboardingType === "PARTNER");

      const staticData = JSON.parse(
        (initialData?.[1]?.data as StaticDataResponse)?.["static-data"] || "{}"
      ) as Record<string, unknown>;

      const additionalPermissions: PermissionsByLevel = { s: [], b: [], c: [] };
      if (profile?.showEdpms) additionalPermissions.b.push("showEdpms");

      const permissions = (initialData?.[2]?.data as Entitlements)?.["User Entitlements"];
      if (permissions) {
        const transformedPermissions = getPermission(permissions, additionalPermissions);
        setPermissions(transformedPermissions);
      }

      setProfile(profile);
      setStaticData(staticData);
      setIsGlobalTenant(Boolean(profile?.isGlobal));

      if (profile) {
        setIsGuestUser(profile.role === "ONBOARDING_USER");

        if (profile.role === "RESELLER_ADMIN" && !hasFetchedCountryCurrencyMapOnce.current) {
          hasFetchedCountryCurrencyMapOnce.current = true;
          void refetchCountryCurrencyMap();
        }

        if (profile.role !== "ONBOARDING_USER" && profile.onboardingId) {
          if (!hasFetchedCountryCurrencyMapOnce.current) {
            hasFetchedCountryCurrencyMapOnce.current = true;
            void refetchCountryCurrencyMap();
          }
          if (!hasFetchedEnabledProductsOnce.current) {
            hasFetchedEnabledProductsOnce.current = true;
            void refetchMerchantProducts();
          }
        }
      }
    }
  }, [
    isInitialLoading,
    isInitialError,
    initialData,
    setProfile,
    setStaticData,
    setPermissions,
    setIsGuestUser,
    setPartnerUser,
    setIsGlobalTenant,
    refetchCountryCurrencyMap,
    refetchMerchantProducts,
  ]);

  useEffect(() => {
    if (merchantProductsData?.data && !isMerchantProductsLoading && !isMerchantProductsError) {
      const merchantEnabledProducts = merchantProductsData.data;
      setMerchantEnabledProducts(merchantEnabledProducts);
      setPaMids(
        merchantEnabledProducts.paMids?.length
          ? merchantEnabledProducts.paMids
          : (merchantEnabledProducts.pacboMids ?? [])
      );
      setPaCbMids(merchantEnabledProducts.pacbMids ?? []);
      setPacboMids(merchantEnabledProducts.pacboMids ?? []);
      setTidsInfo(merchantEnabledProducts.tidInfos ?? []);
      setIsMultiMidUser(merchantEnabledProducts.multiTid ?? false);
    }
  }, [
    merchantProductsData,
    isMerchantProductsLoading,
    isMerchantProductsError,
    setMerchantEnabledProducts,
    setPaMids,
    setPaCbMids,
    setPacboMids,
    setTidsInfo,
    setIsMultiMidUser,
  ]);

  useEffect(() => {
    if (
      countryCurrencyMapData?.data &&
      !isCountryCurrencyMapLoading &&
      !isCountryCurrencyMapError
    ) {
      setCountryCurrencyMap(countryCurrencyMapData.data.countryCurrencyMap);
    }
  }, [
    countryCurrencyMapData,
    isCountryCurrencyMapLoading,
    isCountryCurrencyMapError,
    setCountryCurrencyMap,
  ]);

  return {
    isLoading: isInitialLoading || isMerchantProductsLoading,
    isError: isInitialError || isMerchantProductsError,
  };
}
