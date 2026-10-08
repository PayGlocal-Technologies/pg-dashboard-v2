"use client";

import { useMemo, useState } from "react";
import { AppImage } from "@/components/common/AppImage";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { useBankList, type GlBankInfo } from "@/lib/hooks/useBankList";

const BANK_LOGO_BASE = "https://static.payglocal.in/images/banks/";

// Which GL bank codes have a logo on the static CDN, and at which version.
// The CDN never overwrites a file (static-resource adds `.v2` alongside
// `.v1`), so the latest version is listed here. Taken from the static-resource
// repo's images/banks; a code missing here, or a file that fails to load,
// falls back to the generic bank icon.
const V1_CODES = [
  1002, 1003, 1004, 1005, 1007, 1008, 1009, 1011, 1013, 1014, 1015, 1017, 1018, 1019, 1020, 1021,
  1022, 1023, 1024, 1026, 1027, 1030, 1032, 1034, 1035, 1036, 1037, 1038, 1040, 1041, 1042, 1043,
  1044, 1045, 1046, 1047, 1048, 1049, 1050, 1051, 1052, 1053, 1054, 1055, 1056, 1057, 1058, 1059,
  1060, 1061, 1062, 1063, 1064, 1065, 1066, 1067, 1068, 1069, 1070, 1071, 1072, 1073, 1081, 1084,
  1085, 1087, 1095, 1097, 1099, 1100, 1101, 1102, 1105, 1107, 1109, 1114, 1115, 1117, 1120, 1121,
  1124, 1126, 1127, 1128, 1129, 1130, 1131, 1132, 1133, 1134, 1135, 1142,
];
const V2_CODES = [
  1006, 1010, 1012, 1025, 1039, 1074, 1075, 1076, 1077, 1078, 1079, 1080, 1082, 1083, 1086, 1088,
  1094, 1096, 1098, 1103, 1104, 1106, 1108, 1110, 1111, 1112, 1113, 1116, 1118, 1119, 1122, 1123,
  1125, 1136, 1137, 1138, 1139, 1140, 1141, 1143, 1144, 1145, 1146, 1147, 1148, 1149, 1150, 1151,
  1152, 1153, 1154, 1155, 1156, 1157,
];
const LOGO_VERSION = new Map<string, number>([
  ...V1_CODES.map((c): [string, number] => [`GL_IN_${c}`, 1]),
  ...V2_CODES.map((c): [string, number] => [`GL_IN_${c}`, 2]),
]);

/** A GL bank id's logo URL, or undefined when the CDN has none. */
export function bankLogoUrl(glBankId: string): string | undefined {
  const version = LOGO_VERSION.get(glBankId);
  return version ? `${BANK_LOGO_BASE}${glBankId}.v${version}.svg` : undefined;
}

/** Words that don't tell banks apart: legal suffixes, and the login-type
 *  qualifiers the INB list adds ("[Retail]", "Net Banking Corporate"). */
const NOISE =
  /\b(the|bank|banking|netbanking|net|of|ltd|limited|co|op|coop|cooperative|retail|corporate|corp|nb|now)\b/g;

function normalise(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(NOISE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Short forms a card issuer or merchant may use that the list doesn't. */
const ALIASES: Record<string, string> = {
  sbi: "state india",
  pnb: "punjab national",
  bob: "baroda",
  boi: "india",
  "j and k": "jammu and kashmir",
  jk: "jammu and kashmir",
  kotak: "kotak mahindra",
  idfc: "idfc first",
};

const isCorporate = (b: GlBankInfo) => /corporate|corp\b/i.test(b.bankName);

/**
 * The GL bank behind a name ("HDFC Bank", "STATE BANK OF INDIA", "SBI") or a
 * GL id, or undefined. Several list entries can be the same bank (retail and
 * corporate logins), so ties go to one with a logo, then the non-corporate
 * one: they share the same brand either way.
 */
export function findGlBank(banks: GlBankInfo[], nameOrId?: string): GlBankInfo | undefined {
  if (!nameOrId) return undefined;
  const raw = nameOrId.trim();
  if (/^GL_IN_\d+$/i.test(raw)) return banks.find((b) => b.id === raw.toUpperCase());

  let key = normalise(raw);
  key = ALIASES[key] ?? key;
  if (!key) return undefined;

  const score = (b: GlBankInfo) => (LOGO_VERSION.has(b.id) ? 0 : 2) + (isCorporate(b) ? 1 : 0);
  const best = (list: GlBankInfo[]) => [...list].sort((a, b) => score(a) - score(b))[0];

  const exact = banks.filter((b) => normalise(b.bankName) === key);
  if (exact.length) return best(exact);

  // "Kotak Mahindra" for "Kotak Bank", "IDFC First" for "IDFC FIRST BANK LTD
  // MUMBAI": every word of the shorter name appears in the longer one, and
  // both start with the same word, so "DBS Bank India" can't land on "Bank of
  // India" through the shared "india".
  const words = key.split(" ");
  const partial = banks.filter((b) => {
    const bw = normalise(b.bankName).split(" ");
    if (bw[0] !== words[0]) return false;
    const [short, long] = bw.length <= words.length ? [bw, words] : [words, bw];
    return short.every((w) => long.includes(w));
  });
  return partial.length ? best(partial) : undefined;
}

/**
 * A bank's logo, from the static CDN, found by the bank's name or GL id
 * against the INB bank list. The generic bank icon when the bank isn't in the
 * list, has no logo, or the file fails to load.
 */
export function BankLogo({ name, className }: { name?: string; className?: string }) {
  const banks = useBankList();
  const bank = useMemo(() => findGlBank(banks, name), [banks, name]);
  const src = bank ? bankLogoUrl(bank.id) : undefined;
  // Keyed to the url, so a different bank gets a fresh attempt.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const box = cn(
    "inline-flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-card",
    className
  );

  if (!src || failedSrc === src) {
    return (
      <span className={cn(box, "text-muted-foreground")} aria-hidden>
        <Icon name="building-2" size={13} />
      </span>
    );
  }
  return (
    <span className={box}>
      {/* Remote CDN file, so unoptimized with explicit dimensions (CLAUDE.md). */}
      <AppImage
        src={src}
        alt={bank?.bankName ?? ""}
        width={18}
        height={18}
        unoptimized
        className="h-[18px] w-[18px] object-contain"
        onError={() => setFailedSrc(src)}
      />
    </span>
  );
}

/** A bank's logo with its name beside it, for detail rows. */
export function BankName({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <BankLogo name={name} />
      <span>{name}</span>
    </span>
  );
}
