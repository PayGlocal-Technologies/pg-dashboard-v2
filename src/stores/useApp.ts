import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type PermissionsByLevel = {
  s: string[];
  b: string[];
  c: string[];
};

export type ProfileData =
  | {
      lastName: string | null;
      role: string;
      simulation: string | null;
      mid: string;
      resetupTotpStatus: string | null;
      bankName: string | null;
      formattedPreviousLoginDate: string;
      isGuestUser: boolean;
      tncVerified: boolean;
      lastLoginTime: string;
      hasPassword: boolean;
      firstName: string | null;
      changePasswordStatus: string | null;
      onboardingId: string | null;
      previousFailedLoginAttempts: string;
      authenticationStatus: string;
      username: string;
      emailId: string;
      midType: string;
      onboardingStatus: string;
      generatedUsername: boolean;
      onboardingPending?: boolean;
      merchantSource?: string;
      purposeCodesDec?: boolean | null;
      showEdpms?: boolean | null;
      ucicId?: string | null;
      onboardingType?: string | null;
      isGlobal?: boolean | null;
      "x-gl-gid": string;
      registeredName: string | null;
      userCreationType?: "OLD_FLOW" | "NEW_FLOW" | null;
    }
  | undefined;

export interface Merchant {
  id: string;
  name: string;
}

export interface MidConfig {
  mid: string;
  status: string;
  displayTag: string;
  tradeName: string;
  midContractType: string;
  paFeatures: string[];
  paCbFeatures: string[];
  pacboFeatures: string[];
}

export interface MerchantEnabledProducts {
  paymentProducts: string[];
  pgProducts: string[];
  pacbMids: string[];
  pacboMids: string[];
  paMids: string[];
  tidInfos?: MidConfig[];
  multiTid?: boolean;
}

export interface CountryCurrencyMap {
  countryName: string;
  currencyCode: string;
  currencyName: string;
  iso2CountryCode: string;
}

interface AppState {
  profile: ProfileData;
  permissions: PermissionsByLevel | null;
  staticData: Record<string, unknown> | null;
  merchants: Merchant[];
  activeMerchantId: string | null;
  lastActivity: number;
  idle: boolean;
  isGuestUser: boolean;
  isPartnerUser: boolean;
  isGlobalTenant: boolean;
  merchantEnabledProducts: MerchantEnabledProducts | null;
  paMids: string[];
  paCbMids: string[];
  pacboMids: string[];
  tidsInfo: MidConfig[];
  isMultiMidUser: boolean;
  countryCurrencyMap: CountryCurrencyMap[];

  /** Payload-encryption material (mirrors pg-dashboard). Loaded by getPublicKey. */
  publicKey: string | null;
  kid: string | null;
  isEnc: boolean;

  setProfile: (profile: ProfileData) => void;
  setPermissions: (permissions: PermissionsByLevel) => void;
  setStaticData: (staticData: Record<string, unknown>) => void;
  setMerchants: (merchants: Merchant[]) => void;
  setActiveMerchant: (id: string) => void;
  setIsGuestUser: (isGuestUser: boolean) => void;
  setPartnerUser: (isPartnerUser: boolean) => void;
  setIsGlobalTenant: (isGlobalTenant: boolean) => void;
  setMerchantEnabledProducts: (merchantEnabledProducts: MerchantEnabledProducts) => void;
  setPaMids: (paMids: string[] | null) => void;
  setPaCbMids: (paCbMids: string[] | null) => void;
  setPacboMids: (pacboMids: string[] | null) => void;
  setTidsInfo: (tidsInfo: MidConfig[]) => void;
  setIsMultiMidUser: (isMultiMidUser: boolean) => void;
  setCountryCurrencyMap: (countryCurrencyMap: CountryCurrencyMap[]) => void;
  setPublicKey: (publicKey: string | null) => void;
  setKid: (kid: string | null) => void;
  setEnc: (isEnc: boolean) => void;
  resetTimer: () => void;
  reset: () => void;
}

export const useApp = create<AppState>()(
  devtools(
    (set, get) => ({
      profile: undefined,
      permissions: null,
      staticData: null,
      merchants: [],
      activeMerchantId: null,
      lastActivity: 0,
      idle: false,
      isGuestUser: true,
      isPartnerUser: false,
      isGlobalTenant: false,
      merchantEnabledProducts: null,
      paMids: [],
      paCbMids: [],
      pacboMids: [],
      tidsInfo: [],
      isMultiMidUser: false,
      countryCurrencyMap: [],
      publicKey: null,
      kid: null,
      isEnc: false,

      setProfile: (profile) => set({ profile }, false, "setProfile"),
      setPermissions: (permissions) => set({ permissions }, false, "setPermissions"),
      setStaticData: (staticData) => set({ staticData }, false, "setStaticData"),
      setMerchants: (merchants) =>
        set(
          { merchants, activeMerchantId: get().activeMerchantId ?? merchants[0]?.id ?? null },
          false,
          "setMerchants"
        ),
      setActiveMerchant: (id) => set({ activeMerchantId: id }, false, "setActiveMerchant"),
      setIsGuestUser: (isGuestUser) => set({ isGuestUser }, false, "setIsGuestUser"),
      setPartnerUser: (isPartnerUser) => set({ isPartnerUser }, false, "setPartnerUser"),
      setIsGlobalTenant: (isGlobalTenant) => set({ isGlobalTenant }, false, "setIsGlobalTenant"),
      setMerchantEnabledProducts: (merchantEnabledProducts) =>
        set({ merchantEnabledProducts }, false, "setMerchantEnabledProducts"),
      setPaMids: (paMids) => set({ paMids: paMids ?? [] }, false, "setPaMids"),
      setPaCbMids: (paCbMids) => set({ paCbMids: paCbMids ?? [] }, false, "setPaCbMids"),
      setPacboMids: (pacboMids) => set({ pacboMids: pacboMids ?? [] }, false, "setPacboMids"),
      setTidsInfo: (tidsInfo) => set({ tidsInfo }, false, "setTidsInfo"),
      setIsMultiMidUser: (isMultiMidUser) => set({ isMultiMidUser }, false, "setIsMultiMidUser"),
      setCountryCurrencyMap: (countryCurrencyMap) =>
        set({ countryCurrencyMap }, false, "setCountryCurrencyMap"),
      setPublicKey: (publicKey) => set({ publicKey }, false, "setPublicKey"),
      setKid: (kid) => set({ kid }, false, "setKid"),
      setEnc: (isEnc) => set({ isEnc }, false, "setEnc"),
      resetTimer: () => set({ lastActivity: Date.now(), idle: false }, false, "resetTimer"),
      reset: () =>
        set(
          {
            profile: undefined,
            permissions: null,
            staticData: null,
            merchants: [],
            activeMerchantId: null,
            isGuestUser: true,
            isPartnerUser: false,
            isGlobalTenant: false,
            merchantEnabledProducts: null,
            paMids: [],
            paCbMids: [],
            pacboMids: [],
            tidsInfo: [],
            isMultiMidUser: false,
            countryCurrencyMap: [],
          },
          false,
          "reset"
        ),
    }),
    { name: "app-store" }
  )
);
